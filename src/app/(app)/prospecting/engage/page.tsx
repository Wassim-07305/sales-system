import { createClient } from "@/lib/supabase/server";
import {
  getFeeds,
  getAllFeedPosts,
  getEngageStats,
  getTopComments,
  getTopCreators,
  getHourlyStats,
  getStyleSamples,
  getRecommendations,
} from "@/lib/actions/linkedin-engage";
import { EngageView } from "./engage-view";

export default async function EngagePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [feeds, posts, recommendations, comments, stats, styleSamples] =
    await Promise.all([
      getFeeds(),
      getAllFeedPosts(100),
      getRecommendations(),
      supabase
        .from("linkedin_comment_history")
        .select("*")
        .eq("user_id", user.id)
        .gt("replies_count", 0)
        .order("posted_at", { ascending: false })
        .limit(50)
        .then((r) => r.data ?? []),
      getEngageStats(),
      getStyleSamples(),
    ]);

  return (
    <div className="pb-8">
      <EngageView
        initialFeeds={feeds}
        initialPosts={posts}
        recommendations={recommendations}
        comments={comments}
        stats={stats}
        styleSamples={styleSamples}
      />
    </div>
  );
}
