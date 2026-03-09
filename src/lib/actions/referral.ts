"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

function generateCode(name: string): string {
  const clean = (name || "USER").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 8);
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${clean}-${rand}`;
}

export async function getOrCreateAffiliate() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: existing } = await supabase
    .from("affiliates")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (existing) return existing;

  // Get user name for code generation
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  const code = generateCode(profile?.full_name || "");

  const { data: newAffiliate } = await supabase
    .from("affiliates")
    .insert({ user_id: user.id, referral_code: code })
    .select()
    .single();

  return newAffiliate;
}

export async function getReferrals(affiliateId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("referrals")
    .select("*")
    .eq("affiliate_id", affiliateId)
    .order("created_at", { ascending: false });
  return data || [];
}

export async function trackReferral(referralCode: string, prospectEmail: string, prospectName?: string) {
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

  await supabase
    .from("affiliates")
    .update({ total_referrals: (await supabase.from("referrals").select("id", { count: "exact", head: true }).eq("affiliate_id", affiliate.id)).count || 0 })
    .eq("id", affiliate.id);
}

export async function convertReferral(referralId: string, dealId: string, commission: number) {
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
}

export async function getAllAffiliates() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("affiliates")
    .select("*, user:profiles(id, full_name, email)")
    .order("total_commission", { ascending: false });
  return (data || []).map((d: Record<string, unknown>) => ({
    ...d,
    user: Array.isArray(d.user) ? d.user[0] || null : d.user,
  }));
}
