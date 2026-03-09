import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getGamificationAnalytics } from "@/lib/actions/gamification";
import { GamificationAnalyticsView } from "./analytics-view";

export default async function GamificationAnalyticsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const analytics = await getGamificationAnalytics();

  return <GamificationAnalyticsView data={analytics} />;
}
