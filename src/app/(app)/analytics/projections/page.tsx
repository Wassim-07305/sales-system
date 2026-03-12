import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getRevenueProjections, getAIForecasting } from "@/lib/actions/analytics-v2";
import { ProjectionsView } from "./projections-view";

export default async function ProjectionsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "manager"].includes(profile.role)) {
    redirect("/dashboard");
  }

  // Fetch projections and AI forecasting in parallel
  const [projections, aiData] = await Promise.all([
    getRevenueProjections(),
    getAIForecasting().catch(() => null),
  ]);

  return <ProjectionsView data={projections} aiData={aiData} />;
}
