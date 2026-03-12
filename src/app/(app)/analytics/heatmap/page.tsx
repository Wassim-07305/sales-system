import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getContentHeatmap } from "@/lib/actions/analytics-v2";
import { HeatmapView } from "./heatmap-view";

export default async function HeatmapPage() {
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

  const heatmapData = await getContentHeatmap();

  return <HeatmapView data={heatmapData} />;
}
