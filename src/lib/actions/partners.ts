"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface Partner {
  id: string;
  name: string;
  email: string;
  company: string;
  type: "technology" | "consulting" | "referral";
  commission_rate: number;
  status: "active" | "pending" | "inactive";
  installations: number;
  revenue_generated: number;
  rating: number;
  notes: string | null;
  contact_phone: string | null;
  website: string | null;
  created_at: string;
  approved_at: string | null;
}

export interface PartnerPayout {
  id: string;
  partner_id: string;
  partner_name?: string;
  amount: number;
  period: string;
  status: "paid" | "pending" | "processing" | "failed";
  payment_method: string | null;
  payment_reference: string | null;
  paid_at: string | null;
  created_at: string;
}

export interface PartnerReferral {
  id: string;
  partner_id: string;
  referred_email: string | null;
  referred_name: string | null;
  deal_id: string | null;
  deal_value: number;
  commission_amount: number;
  status: "pending" | "converted" | "paid" | "expired";
  created_at: string;
  converted_at: string | null;
}

export interface PartnerRevenue {
  month: string;
  revenue: number;
  commission: number;
  partners_count: number;
}

export interface PartnerStats {
  totalPartners: number;
  activePartners: number;
  pendingPartners: number;
  totalRevenue: number;
  totalCommissions: number;
  monthlyData: PartnerRevenue[];
}

// ─── GET ALL PARTNERS ────────────────────────────────────────────
export async function getPartners(): Promise<Partner[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifie");

  const { data, error } = await supabase
    .from("partners")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching partners:", error);
    return [];
  }

  return (data || []) as Partner[];
}

// ─── GET PARTNER DETAILS ─────────────────────────────────────────
export async function getPartnerDetails(
  partnerId: string,
): Promise<Partner | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifie");

  const { data, error } = await supabase
    .from("partners")
    .select("*")
    .eq("id", partnerId)
    .single();

  if (error) {
    console.error("Error fetching partner:", error);
    return null;
  }

  return data as Partner;
}

// ─── CREATE PARTNER ──────────────────────────────────────────────
export async function createPartner(data: {
  name: string;
  email: string;
  company: string;
  type: "technology" | "consulting" | "referral";
  commissionRate: number;
  contactPhone?: string;
  website?: string;
  notes?: string;
}): Promise<Partner> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifie");

  // Check if email already exists
  const { data: existing } = await supabase
    .from("partners")
    .select("id")
    .eq("email", data.email)
    .single();

  if (existing) {
    throw new Error("Un partenaire avec cet email existe deja");
  }

  const { data: partner, error } = await supabase
    .from("partners")
    .insert({
      name: data.name,
      email: data.email,
      company: data.company,
      type: data.type,
      commission_rate: data.commissionRate,
      contact_phone: data.contactPhone || null,
      website: data.website || null,
      notes: data.notes || null,
      status: "pending",
      installations: 0,
      revenue_generated: 0,
      rating: 0,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating partner:", error);
    throw new Error("Erreur lors de la creation du partenaire");
  }

  revalidatePath("/marketplace/partners");
  return partner as Partner;
}

// ─── UPDATE PARTNER ──────────────────────────────────────────────
export async function updatePartner(
  id: string,
  updates: Partial<{
    name: string;
    email: string;
    company: string;
    type: "technology" | "consulting" | "referral";
    commission_rate: number;
    status: "active" | "pending" | "inactive";
    contact_phone: string | null;
    website: string | null;
    notes: string | null;
    rating: number;
  }>,
): Promise<Partner> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifie");

  const { data, error } = await supabase
    .from("partners")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating partner:", error);
    throw new Error("Erreur lors de la mise a jour du partenaire");
  }

  revalidatePath("/marketplace/partners");
  return data as Partner;
}

// ─── DELETE PARTNER ──────────────────────────────────────────────
export async function deletePartner(id: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifie");

  const { error } = await supabase.from("partners").delete().eq("id", id);

  if (error) {
    console.error("Error deleting partner:", error);
    throw new Error("Erreur lors de la suppression du partenaire");
  }

  revalidatePath("/marketplace/partners");
}

// ─── APPROVE PARTNER ─────────────────────────────────────────────
export async function approvePartner(id: string): Promise<Partner> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifie");

  const { data, error } = await supabase
    .from("partners")
    .update({
      status: "active",
      approved_at: new Date().toISOString(),
      approved_by: user.id,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error approving partner:", error);
    throw new Error("Erreur lors de l'approbation du partenaire");
  }

  revalidatePath("/marketplace/partners");
  return data as Partner;
}

// ─── DEACTIVATE PARTNER ──────────────────────────────────────────
export async function deactivatePartner(id: string): Promise<Partner> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifie");

  const { data, error } = await supabase
    .from("partners")
    .update({ status: "inactive", updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error deactivating partner:", error);
    throw new Error("Erreur lors de la desactivation du partenaire");
  }

  revalidatePath("/marketplace/partners");
  return data as Partner;
}

// ─── GET PARTNER STATS ───────────────────────────────────────────
export async function getPartnerStats(): Promise<PartnerStats> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifie");

  // Get partners counts
  const { data: partners } = await supabase
    .from("partners")
    .select("id, status, revenue_generated, commission_rate");

  const allPartners = partners || [];
  const activePartners = allPartners.filter((p) => p.status === "active");
  const pendingPartners = allPartners.filter((p) => p.status === "pending");

  const totalRevenue = allPartners.reduce(
    (sum, p) => sum + (p.revenue_generated || 0),
    0,
  );
  const totalCommissions = allPartners.reduce(
    (sum, p) =>
      sum + ((p.revenue_generated || 0) * (p.commission_rate || 0)) / 100,
    0,
  );

  // Get monthly data from referrals
  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const { data: referrals } = await supabase
    .from("partner_referrals")
    .select("deal_value, commission_amount, partner_id, converted_at")
    .gte("converted_at", sixMonthsAgo.toISOString())
    .eq("status", "converted");

  // Group by month
  const monthlyMap = new Map<
    string,
    { revenue: number; commission: number; partners: Set<string> }
  >();

  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = date.toLocaleDateString("fr-FR", {
      month: "short",
      year: "numeric",
    });
    monthlyMap.set(monthKey, {
      revenue: 0,
      commission: 0,
      partners: new Set(),
    });
  }

  (referrals || []).forEach((ref) => {
    if (ref.converted_at) {
      const date = new Date(ref.converted_at);
      const monthKey = date.toLocaleDateString("fr-FR", {
        month: "short",
        year: "numeric",
      });
      const entry = monthlyMap.get(monthKey);
      if (entry) {
        entry.revenue += ref.deal_value || 0;
        entry.commission += ref.commission_amount || 0;
        entry.partners.add(ref.partner_id);
      }
    }
  });

  const monthlyData = Array.from(monthlyMap.entries()).map(([month, data]) => ({
    month,
    revenue: data.revenue,
    commission: data.commission,
    partners_count: data.partners.size,
  }));

  return {
    totalPartners: allPartners.length,
    activePartners: activePartners.length,
    pendingPartners: pendingPartners.length,
    totalRevenue,
    totalCommissions,
    monthlyData,
  };
}

// ─── GET PARTNER PAYOUTS ─────────────────────────────────────────
export async function getPartnerPayouts(
  partnerId?: string,
): Promise<PartnerPayout[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifie");

  let query = supabase
    .from("partner_payouts")
    .select("*, partners(name)")
    .order("created_at", { ascending: false });

  if (partnerId) {
    query = query.eq("partner_id", partnerId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching payouts:", error);
    return [];
  }

  return (data || []).map((p) => ({
    ...p,
    partner_name: (p.partners as { name: string } | null)?.name || "Inconnu",
  })) as PartnerPayout[];
}

// ─── CREATE PAYOUT ───────────────────────────────────────────────
export async function createPayout(data: {
  partnerId: string;
  amount: number;
  period: string;
  paymentMethod?: string;
  notes?: string;
}): Promise<PartnerPayout> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifie");

  const { data: payout, error } = await supabase
    .from("partner_payouts")
    .insert({
      partner_id: data.partnerId,
      amount: data.amount,
      period: data.period,
      payment_method: data.paymentMethod || null,
      notes: data.notes || null,
      status: "pending",
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating payout:", error);
    throw new Error("Erreur lors de la creation du paiement");
  }

  revalidatePath("/marketplace/partners");
  return payout as PartnerPayout;
}

// ─── PROCESS PAYOUT ──────────────────────────────────────────────
export async function processPayout(
  payoutId: string,
  status: "processing" | "paid" | "failed",
  paymentReference?: string,
): Promise<PartnerPayout> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifie");

  const updates: Record<string, unknown> = {
    status,
    processed_by: user.id,
  };

  if (status === "paid") {
    updates.paid_at = new Date().toISOString();
  }

  if (paymentReference) {
    updates.payment_reference = paymentReference;
  }

  const { data, error } = await supabase
    .from("partner_payouts")
    .update(updates)
    .eq("id", payoutId)
    .select()
    .single();

  if (error) {
    console.error("Error processing payout:", error);
    throw new Error("Erreur lors du traitement du paiement");
  }

  revalidatePath("/marketplace/partners");
  return data as PartnerPayout;
}

// ─── GET PARTNER REFERRALS ───────────────────────────────────────
export async function getPartnerReferrals(
  partnerId: string,
): Promise<PartnerReferral[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifie");

  const { data, error } = await supabase
    .from("partner_referrals")
    .select("*")
    .eq("partner_id", partnerId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching referrals:", error);
    return [];
  }

  return (data || []) as PartnerReferral[];
}

// ─── RECORD REFERRAL ─────────────────────────────────────────────
export async function recordReferral(data: {
  partnerId: string;
  referredEmail: string;
  referredName: string;
}): Promise<PartnerReferral> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifie");

  const { data: referral, error } = await supabase
    .from("partner_referrals")
    .insert({
      partner_id: data.partnerId,
      referred_email: data.referredEmail,
      referred_name: data.referredName,
      status: "pending",
    })
    .select()
    .single();

  if (error) {
    console.error("Error recording referral:", error);
    throw new Error("Erreur lors de l'enregistrement du referral");
  }

  revalidatePath("/marketplace/partners");
  return referral as PartnerReferral;
}

// ─── CONVERT REFERRAL ────────────────────────────────────────────
export async function convertReferral(
  referralId: string,
  dealId: string,
  dealValue: number,
): Promise<PartnerReferral> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifie");

  // Get partner commission rate
  const { data: referral } = await supabase
    .from("partner_referrals")
    .select("partner_id")
    .eq("id", referralId)
    .single();

  if (!referral) throw new Error("Referral introuvable");

  const { data: partner } = await supabase
    .from("partners")
    .select("commission_rate")
    .eq("id", referral.partner_id)
    .single();

  const commissionRate = partner?.commission_rate || 10;
  const commissionAmount = (dealValue * commissionRate) / 100;

  // Update referral
  const { data: updated, error } = await supabase
    .from("partner_referrals")
    .update({
      deal_id: dealId,
      deal_value: dealValue,
      commission_amount: commissionAmount,
      status: "converted",
      converted_at: new Date().toISOString(),
    })
    .eq("id", referralId)
    .select()
    .single();

  if (error) {
    console.error("Error converting referral:", error);
    throw new Error("Erreur lors de la conversion du referral");
  }

  // Update partner stats
  await supabase
    .from("partners")
    .update({
      revenue_generated: supabase.rpc("increment_numeric", {
        row_id: referral.partner_id,
        table_name: "partners",
        column_name: "revenue_generated",
        amount: dealValue,
      }),
      installations: supabase.rpc("increment_int", {
        row_id: referral.partner_id,
        table_name: "partners",
        column_name: "installations",
        amount: 1,
      }),
    })
    .eq("id", referral.partner_id);

  revalidatePath("/marketplace/partners");
  return updated as PartnerReferral;
}
