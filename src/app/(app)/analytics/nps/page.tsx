import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getNpsAnalytics } from "@/lib/actions/nps";
import { NpsAnalyticsView } from "./nps-analytics-view";

export default async function NpsAnalyticsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "manager"].includes(profile.role)) {
    redirect("/dashboard");
  }

  const data = await getNpsAnalytics();

  return <NpsAnalyticsView data={data} />;
}
