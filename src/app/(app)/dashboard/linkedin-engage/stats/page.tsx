import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getEngageStats,
  getTopComments,
  getTopCreators,
  getHourlyStats,
} from "@/lib/actions/linkedin-engage";
import { StatsView } from "./stats-view";

export default async function StatsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [stats, topComments, topCreators, hourlyStats] = await Promise.all([
    getEngageStats(),
    getTopComments(10),
    getTopCreators(),
    getHourlyStats(),
  ]);

  return (
    <StatsView
      stats={stats}
      topComments={topComments}
      topCreators={topCreators}
      hourlyStats={hourlyStats}
    />
  );
}
