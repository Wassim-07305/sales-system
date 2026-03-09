import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  getMonetizationOverview,
  getExtensionPricing,
  getPayoutHistory,
  getCommissionRates,
} from "@/lib/actions/monetization";
import { MonetizationView } from "./monetization-view";

export default async function MonetizationPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [overview, pricing, payouts, commissions] = await Promise.all([
    getMonetizationOverview(),
    getExtensionPricing(),
    getPayoutHistory(),
    getCommissionRates(),
  ]);

  return (
    <MonetizationView
      overview={overview}
      pricing={pricing}
      payouts={payouts}
      commissions={commissions}
    />
  );
}
