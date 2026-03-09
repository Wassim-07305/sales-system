import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getPartners, getPartnerRevenue } from "@/lib/actions/partners";
import { PartnersView } from "./partners-view";

export default async function PartnersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [partners, revenueData] = await Promise.all([
    getPartners(),
    getPartnerRevenue(),
  ]);

  return (
    <PartnersView
      partners={partners}
      revenueData={revenueData}
    />
  );
}
