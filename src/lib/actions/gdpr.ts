"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { logAuditEvent } from "@/lib/actions/audit-log";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ConsentSettings {
  analytics: boolean;
  marketing: boolean;
  communication: boolean;
  third_party_sharing: boolean;
  updated_at: string | null;
}

export interface DataExport {
  exported_at: string;
  profile: Record<string, unknown> | null;
  deals: Record<string, unknown>[];
  bookings: Record<string, unknown>[];
  prospects: Record<string, unknown>[];
  notifications: Record<string, unknown>[];
  contacts: Record<string, unknown>[];
  audit_logs: Record<string, unknown>[];
}

export interface DataProcessingLogEntry {
  id: string;
  action: string;
  entity_type: string;
  details: Record<string, unknown>;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Export User Data (Right to Access / Portability - RGPD Art. 15 & 20)
// ---------------------------------------------------------------------------

export async function exportUserData(): Promise<DataExport | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const userId = user.id;

  // Fetch all user data in parallel
  const [
    profileResult,
    dealsResult,
    bookingsResult,
    prospectsResult,
    notificationsResult,
    contactsResult,
    auditResult,
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).single(),
    supabase.from("deals").select("*").eq("assigned_to", userId),
    supabase.from("bookings").select("*").eq("user_id", userId),
    supabase.from("prospects").select("*").eq("assigned_to", userId),
    supabase.from("notifications").select("*").eq("user_id", userId),
    supabase.from("contacts").select("*").eq("user_id", userId),
    supabase.from("audit_logs").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(200),
  ]);

  await logAuditEvent({
    action: "gdpr_data_export",
    entity_type: "gdpr",
    entity_id: userId,
    details: { description: "Export des donnees personnelles (RGPD Art. 15 & 20)" },
  });

  return {
    exported_at: new Date().toISOString(),
    profile: profileResult.data ?? null,
    deals: dealsResult.data ?? [],
    bookings: bookingsResult.data ?? [],
    prospects: prospectsResult.data ?? [],
    notifications: notificationsResult.data ?? [],
    contacts: contactsResult.data ?? [],
    audit_logs: auditResult.data ?? [],
  };
}

// ---------------------------------------------------------------------------
// Delete / Anonymize User Data (Right to Erasure - RGPD Art. 17)
// ---------------------------------------------------------------------------

export async function deleteUserData(): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non authentifie" };

  const userId = user.id;

  try {
    // Log before anonymizing (so we still have user_id)
    await logAuditEvent({
      action: "gdpr_data_deletion",
      entity_type: "gdpr",
      entity_id: userId,
      details: { description: "Suppression/anonymisation des donnees personnelles (RGPD Art. 17)" },
    });

    // Anonymize profile instead of hard delete (preserves referential integrity)
    await supabase
      .from("profiles")
      .update({
        full_name: "Utilisateur supprime",
        email: `deleted_${userId.slice(0, 8)}@anonymized.local`,
        avatar_url: null,
        phone: null,
        company: null,
        niche: null,
        current_revenue: null,
        goals: null,
      })
      .eq("id", userId);

    // Delete personal notifications
    await supabase.from("notifications").delete().eq("user_id", userId);

    // Anonymize deals (keep for business analytics but remove personal link)
    await supabase
      .from("deals")
      .update({ notes: null })
      .eq("assigned_to", userId);

    // Delete prospects linked to this user
    await supabase.from("prospects").delete().eq("assigned_to", userId);

    // Delete user consents
    await supabase.from("user_consents").delete().eq("user_id", userId);

    revalidatePath("/settings/privacy");
    return { success: true };
  } catch {
    return { success: false, error: "Erreur lors de la suppression des donnees" };
  }
}

// ---------------------------------------------------------------------------
// Get Consent Status (RGPD Art. 7)
// ---------------------------------------------------------------------------

export async function getConsentStatus(): Promise<ConsentSettings> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const defaults: ConsentSettings = {
    analytics: false,
    marketing: false,
    communication: false,
    third_party_sharing: false,
    updated_at: null,
  };

  if (!user) return defaults;

  const { data } = await supabase
    .from("user_consents")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!data) return defaults;

  return {
    analytics: (data.analytics as boolean) ?? false,
    marketing: (data.marketing as boolean) ?? false,
    communication: (data.communication as boolean) ?? false,
    third_party_sharing: (data.third_party_sharing as boolean) ?? false,
    updated_at: (data.updated_at as string) ?? null,
  };
}

// ---------------------------------------------------------------------------
// Update Consent (RGPD Art. 7)
// ---------------------------------------------------------------------------

export async function updateConsent(consents: {
  analytics: boolean;
  marketing: boolean;
  communication: boolean;
  third_party_sharing: boolean;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non authentifie" };

  const now = new Date().toISOString();

  const { error } = await supabase.from("user_consents").upsert(
    {
      user_id: user.id,
      analytics: consents.analytics,
      marketing: consents.marketing,
      communication: consents.communication,
      third_party_sharing: consents.third_party_sharing,
      updated_at: now,
    },
    { onConflict: "user_id" }
  );

  if (error) {
    return { success: false, error: error.message };
  }

  await logAuditEvent({
    action: "gdpr_consent_update",
    entity_type: "gdpr",
    entity_id: user.id,
    details: { consents, updated_at: now },
  });

  revalidatePath("/settings/privacy");
  return { success: true };
}

// ---------------------------------------------------------------------------
// Get Data Processing Log (RGPD Art. 30)
// ---------------------------------------------------------------------------

export async function getDataProcessingLog(): Promise<DataProcessingLogEntry[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("audit_logs")
    .select("id, action, entity_type, details, created_at")
    .eq("user_id", user.id)
    .in("entity_type", ["gdpr", "consent", "profile", "data_export", "data_deletion"])
    .order("created_at", { ascending: false })
    .limit(50);

  if (!data) return [];

  return data.map((row) => ({
    id: row.id as string,
    action: row.action as string,
    entity_type: row.entity_type as string,
    details: (row.details as Record<string, unknown>) ?? {},
    created_at: row.created_at as string,
  }));
}
