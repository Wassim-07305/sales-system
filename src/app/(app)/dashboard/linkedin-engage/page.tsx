import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getEngageStats, getRecentActivity } from "@/lib/actions/linkedin-engage";
import { LinkedInEngageDashboard } from "./engage-dashboard";

export default async function LinkedInEngagePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [stats, recentActivity] = await Promise.all([
    getEngageStats(),
    getRecentActivity(5),
  ]);

  return (
    <LinkedInEngageDashboard
      stats={stats}
      recentActivity={recentActivity}
    />
  );
}
