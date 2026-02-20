import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getOrCreateAffiliate, getReferrals } from "@/lib/actions/referral";
import { ReferralView } from "./referral-view";

export default async function ReferralPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const affiliate = await getOrCreateAffiliate();
  const referrals = affiliate ? await getReferrals(affiliate.id) : [];

  return <ReferralView affiliate={affiliate} referrals={referrals} />;
}
