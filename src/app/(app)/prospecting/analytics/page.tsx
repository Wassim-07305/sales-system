import { createClient } from "@/lib/supabase/server";
import {
  getEngageStats,
  getTopComments,
  getTopCreators,
  getHourlyStats,
  getStyleSamples,
} from "@/lib/actions/linkedin-engage";
import { AnalyticsView } from "./analytics-view";

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [stats, topComments, topCreators, hourlyStats, styleSamples] =
    await Promise.all([
      getEngageStats(),
      getTopComments(10),
      getTopCreators(),
      getHourlyStats(),
      getStyleSamples(),
    ]);

  return (
    <div className="pb-8">
      <AnalyticsView
        stats={stats}
        topComments={topComments}
        topCreators={topCreators}
        hourlyStats={hourlyStats}
        styleSamples={styleSamples}
      />
    </div>
  );
}
