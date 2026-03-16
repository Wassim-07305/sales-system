import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  getOrCreateAffiliate,
  getReferrals,
  getReferralStats,
} from "@/lib/actions/referral";
import { ReferralView } from "./referral-view";

export default async function ReferralPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [affiliate, stats] = await Promise.all([
    getOrCreateAffiliate(),
    getReferralStats(),
  ]);

  const referrals = affiliate ? await getReferrals(affiliate.id) : [];

  return (
    <ReferralView affiliate={affiliate} referrals={referrals} stats={stats} />
  );
}
