import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getEngageStats,
  getTopComments,
  getTopCreators,
  getHourlyStats,
  getStyleSamples,
} from "@/lib/actions/linkedin-engage";
import { StatsAndStyleView } from "./stats-and-style-view";

export default async function StatsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [stats, topComments, topCreators, hourlyStats, styleSamples] =
    await Promise.all([
      getEngageStats(),
      getTopComments(10),
      getTopCreators(),
      getHourlyStats(),
      getStyleSamples(),
    ]);

  return (
    <StatsAndStyleView
      stats={stats}
      topComments={topComments}
      topCreators={topCreators}
      hourlyStats={hourlyStats}
      initialSamples={styleSamples}
    />
  );
}
