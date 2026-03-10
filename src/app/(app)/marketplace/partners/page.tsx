import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getPartners, getPartnerStats, getPartnerPayouts } from "@/lib/actions/partners";
import { PartnersView } from "./partners-view";

export default async function PartnersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [partners, stats, payouts] = await Promise.all([
    getPartners(),
    getPartnerStats(),
    getPartnerPayouts(),
  ]);

  return (
    <PartnersView
      partners={partners}
      revenueData={{
        monthly: stats.monthlyData,
        payouts: payouts,
      }}
    />
  );
}
