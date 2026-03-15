"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// ─── Helpers ─────────────────────────────────────────────────────────

function isTableMissing(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  const msg = (error.message || "").toLowerCase();
  return (
    msg.includes("relation") && msg.includes("does not exist") ||
    error.code === "42P01"
  );
}

// ---------------------------------------------------------------------------
// MFA Status
// ---------------------------------------------------------------------------

export async function getMfaStatus() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { enrolled: false, factors: [] as { id: string; friendly_name: string; factor_type: string; status: string; created_at: string }[] };

  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error || !data) return { enrolled: false, factors: [] };

  const totpFactors = data.totp.map((f) => ({
    id: f.id,
    friendly_name: f.friendly_name ?? "",
    factor_type: f.factor_type,
    status: f.status,
    created_at: f.created_at,
  }));

  const verified = totpFactors.filter((f) => f.status === "verified");

  return {
    enrolled: verified.length > 0,
    factors: totpFactors,
  };
}

// ---------------------------------------------------------------------------
// Enroll MFA
// ---------------------------------------------------------------------------

export async function enrollMfa() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false as const, error: "Non authentifie" };

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
  });

  if (error || !data) {
    return { success: false as const, error: error?.message ?? "Erreur lors de l'activation" };
  }

  return {
    success: true as const,
    factorId: data.id,
    qrCode: data.totp.qr_code,
    secret: data.totp.secret,
    uri: data.totp.uri,
  };
}

// ---------------------------------------------------------------------------
// Verify MFA Enrollment
// ---------------------------------------------------------------------------

export async function verifyMfaEnrollment(factorId: string, code: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non authentifie" };

  const { data: challenge, error: challengeError } =
    await supabase.auth.mfa.challenge({ factorId });

  if (challengeError || !challenge) {
    return { success: false, error: challengeError?.message ?? "Erreur de challenge" };
  }

  const { error: verifyError } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code,
  });

  if (verifyError) {
    return { success: false, error: verifyError.message };
  }

  revalidatePath("/settings/security");
  return { success: true };
}

// ---------------------------------------------------------------------------
// Unenroll MFA
// ---------------------------------------------------------------------------

export async function unenrollMfa(factorId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non authentifie" };

  const { error } = await supabase.auth.mfa.unenroll({ factorId });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/settings/security");
  return { success: true };
}

// ---------------------------------------------------------------------------
// Security Settings (stored in user metadata)
// ---------------------------------------------------------------------------

export async function getSecuritySettings() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const defaults = {
    sessionTimeout: 60,
    ipWhitelist: [] as string[],
  };

  if (!user) return defaults;

  const metadata = user.user_metadata;
  return {
    sessionTimeout: (metadata?.session_timeout as number) ?? 60,
    ipWhitelist: (metadata?.ip_whitelist as string[]) ?? [],
  };
}

export async function updateSecuritySettings(settings: {
  sessionTimeout: number;
  ipWhitelist: string[];
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non authentifie" };

  const { error } = await supabase.auth.updateUser({
    data: {
      session_timeout: settings.sessionTimeout,
      ip_whitelist: settings.ipWhitelist,
    },
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/settings/security");
  return { success: true };
}

// ---------------------------------------------------------------------------
// Login History — query audit_logs table, return [] if unavailable
// ---------------------------------------------------------------------------

export async function getLoginHistory() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("audit_logs")
    .select("*")
    .eq("user_id", user.id)
    .in("action", ["login", "login_failed", "auth.login", "auth.login_failed"])
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    if (isTableMissing(error)) return [];
    // If the table exists but the query fails for another reason, return empty
    return [];
  }

  return (data || []).map((log: Record<string, unknown>) => {
    const meta = (log.metadata || {}) as Record<string, unknown>;
    return {
      id: (log.id as string) || "",
      date: (log.created_at as string) || "",
      ip: (log.ip_address as string) || (meta.ip as string) || "",
      device: (log.user_agent as string) || (meta.device as string) || "",
      status: ((log.action as string) || "").includes("failed") ? "failed" as const : "success" as const,
      location: (meta.location as string) || "",
    };
  });
}

// ---------------------------------------------------------------------------
// Active Sessions — return current session only (honest approach)
// ---------------------------------------------------------------------------

export async function getActiveSessions() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  // Supabase does not expose session listing to client-side.
  // Return the current session as the only known active session.
  return [
    {
      id: user.id,
      device: "Session actuelle",
      ip: "",
      lastActive: new Date().toISOString(),
      current: true,
    },
  ];
}
