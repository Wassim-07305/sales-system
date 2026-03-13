"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

function generateCode(name: string): string {
  const clean = (name || "USER").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 8);
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${clean}-${rand}`;
}

// ── Get or create affiliate (referral code) ──────────────────────────
export async function getOrCreateAffiliate() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: existing, error: fetchErr } = await supabase
      .from("affiliates")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (existing) return existing;
    if (fetchErr && fetchErr.code !== "PGRST116") {
      // PGRST116 = no rows — anything else may mean table missing
      console.warn("[referral] affiliates fetch error:", fetchErr.message);
      return null;
    }

    // Get user name for code generation
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    const code = generateCode(profile?.full_name || "");

    const { data: newAffiliate, error: insertErr } = await supabase
      .from("affiliates")
      .insert({ user_id: user.id, referral_code: code })
      .select()
      .single();

    if (insertErr) {
      console.warn("[referral] affiliate insert error:", insertErr.message);
      return null;
    }

    return newAffiliate;
  } catch (err) {
    console.warn("[referral] getOrCreateAffiliate failed:", err);
    return null;
  }
}

// ── Alias: get or create referral code ───────────────────────────────
export async function getOrCreateReferralCode(): Promise<string | null> {
  const affiliate = await getOrCreateAffiliate();
  return affiliate?.referral_code ?? null;
}

// ── Get referral list for an affiliate ───────────────────────────────
export async function getReferrals(affiliateId: string) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("referrals")
      .select("*")
      .eq("affiliate_id", affiliateId)
      .order("created_at", { ascending: false });
    if (error) {
      console.warn("[referral] getReferrals error:", error.message);
      return [];
    }
    return data || [];
  } catch {
    return [];
  }
}

// ── Referral stats (totals) ──────────────────────────────────────────
export async function getReferralStats() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { total: 0, converted: 0, pending: 0, expired: 0, totalRewards: 0, conversionRate: 0 };

    const { data: affiliate } = await supabase
      .from("affiliates")
      .select("id, total_referrals, total_converted, total_commission")
      .eq("user_id", user.id)
      .single();

    if (!affiliate) return { total: 0, converted: 0, pending: 0, expired: 0, totalRewards: 0, conversionRate: 0 };

    const { data: referrals } = await supabase
      .from("referrals")
      .select("status")
      .eq("affiliate_id", affiliate.id);

    const list = referrals || [];
    const pending = list.filter((r) => r.status === "pending").length;
    const converted = list.filter((r) => r.status === "converted").length;
    const expired = list.filter((r) => r.status === "expired").length;
    const total = list.length;

    return {
      total,
      converted,
      pending,
      expired,
      totalRewards: Number(affiliate.total_commission || 0),
      conversionRate: total > 0 ? Math.round((converted / total) * 100) : 0,
    };
  } catch {
    return { total: 0, converted: 0, pending: 0, expired: 0, totalRewards: 0, conversionRate: 0 };
  }
}

// ── Referral history with details ────────────────────────────────────
export async function getReferralHistory() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: affiliate } = await supabase
      .from("affiliates")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!affiliate) return [];

    const { data, error } = await supabase
      .from("referrals")
      .select("*")
      .eq("affiliate_id", affiliate.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("[referral] getReferralHistory error:", error.message);
      return [];
    }
    return data || [];
  } catch {
    return [];
  }
}

// ── Track a new referral (inbound) ───────────────────────────────────
export async function trackReferral(referralCode: string, prospectEmail: string, prospectName?: string) {
  try {
    const supabase = await createClient();

    const { data: affiliate } = await supabase
      .from("affiliates")
      .select("id")
      .eq("referral_code", referralCode)
      .single();

    if (!affiliate) return;

    await supabase.from("referrals").insert({
      affiliate_id: affiliate.id,
      referred_email: prospectEmail,
      referred_name: prospectName || null,
      status: "pending",
    });

    // Recalculate total_referrals
    const { count } = await supabase
      .from("referrals")
      .select("id", { count: "exact", head: true })
      .eq("affiliate_id", affiliate.id);

    await supabase
      .from("affiliates")
      .update({ total_referrals: count || 0 })
      .eq("id", affiliate.id);

    revalidatePath("/referral");
  } catch (err) {
    console.warn("[referral] trackReferral failed:", err);
  }
}

// ── Track conversion by referral code (when referred user signs up / completes onboarding) ──
export async function trackReferralConversion(referralCode: string) {
  try {
    const supabase = await createClient();

    const { data: affiliate } = await supabase
      .from("affiliates")
      .select("id, commission_rate")
      .eq("referral_code", referralCode)
      .single();

    if (!affiliate) return;

    // Find the most recent pending referral for this affiliate
    const { data: pendingRef } = await supabase
      .from("referrals")
      .select("id")
      .eq("affiliate_id", affiliate.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!pendingRef) return;

    await supabase.from("referrals").update({
      status: "converted",
      commission: Number(affiliate.commission_rate || 10),
    }).eq("id", pendingRef.id);

    // Recalculate affiliate totals
    const { count: converted } = await supabase
      .from("referrals")
      .select("id", { count: "exact", head: true })
      .eq("affiliate_id", affiliate.id)
      .eq("status", "converted");

    const { data: allRefs } = await supabase
      .from("referrals")
      .select("commission")
      .eq("affiliate_id", affiliate.id)
      .eq("status", "converted");

    const totalCommission = (allRefs || []).reduce((sum, r) => sum + Number(r.commission || 0), 0);

    await supabase.from("affiliates").update({
      total_converted: converted || 0,
      total_commission: totalCommission,
    }).eq("id", affiliate.id);

    revalidatePath("/referral");
  } catch (err) {
    console.warn("[referral] trackReferralConversion failed:", err);
  }
}

// ── Convert a specific referral (admin / deal-linked) ────────────────
export async function convertReferral(referralId: string, dealId: string, commission: number) {
  try {
    const supabase = await createClient();

    await supabase.from("referrals").update({
      status: "converted",
      deal_id: dealId,
      commission,
    }).eq("id", referralId);

    // Update affiliate totals
    const { data: referral } = await supabase.from("referrals").select("affiliate_id").eq("id", referralId).single();
    if (referral) {
      const { count: converted } = await supabase
        .from("referrals")
        .select("id", { count: "exact", head: true })
        .eq("affiliate_id", referral.affiliate_id)
        .eq("status", "converted");

      const { data: allRefs } = await supabase
        .from("referrals")
        .select("commission")
        .eq("affiliate_id", referral.affiliate_id)
        .eq("status", "converted");

      const totalCommission = (allRefs || []).reduce((sum, r) => sum + Number(r.commission || 0), 0);

      await supabase.from("affiliates").update({
        total_converted: converted || 0,
        total_commission: totalCommission,
      }).eq("id", referral.affiliate_id);
    }

    revalidatePath("/referral");
  } catch (err) {
    console.warn("[referral] convertReferral failed:", err);
  }
}

// ── Send referral invitation (create pending referral) ───────────────
export async function sendReferralInvite(email: string, name?: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Non authentifié" };

    const { data: affiliate } = await supabase
      .from("affiliates")
      .select("id, referral_code")
      .eq("user_id", user.id)
      .single();

    if (!affiliate) return { error: "Aucun code parrain" };

    // Check if already referred
    const { data: existing } = await supabase
      .from("referrals")
      .select("id")
      .eq("affiliate_id", affiliate.id)
      .eq("referred_email", email)
      .single();

    if (existing) return { error: "Cette personne a déjà été parrainée" };

    await supabase.from("referrals").insert({
      affiliate_id: affiliate.id,
      referred_email: email,
      referred_name: name || null,
      status: "pending",
    });

    // Update count
    const { count } = await supabase
      .from("referrals")
      .select("id", { count: "exact", head: true })
      .eq("affiliate_id", affiliate.id);

    await supabase.from("affiliates").update({
      total_referrals: count || 0,
    }).eq("id", affiliate.id);

    revalidatePath("/referral");
    return { success: true };
  } catch {
    return { error: "Erreur lors de l'envoi" };
  }
}

// ── List all affiliates (admin view) ─────────────────────────────────
export async function getAllAffiliates() {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("affiliates")
      .select("*, user:profiles(id, full_name, email)")
      .order("total_commission", { ascending: false });
    return (data || []).map((d: Record<string, unknown>) => ({
      ...d,
      user: Array.isArray(d.user) ? d.user[0] || null : d.user,
    }));
  } catch {
    return [];
  }
}
