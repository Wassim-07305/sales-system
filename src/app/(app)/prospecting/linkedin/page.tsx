import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getFeeds,
  getAllFeedPosts,
  getRecommendations,
  getEngageStats,
  getTopComments,
  getTopCreators,
  getHourlyStats,
  getStyleSamples,
} from "@/lib/actions/linkedin-engage";
import { getProspects } from "@/lib/actions/prospecting";
import { getUnipileStatus } from "@/lib/actions/unipile";
import { LinkedinUnifiedView } from "./linkedin-unified-view";

export default async function LinkedInPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [
    feeds,
    posts,
    prospects,
    unipileStatus,
    recommendations,
    commentsResult,
    stats,
    topComments,
    topCreators,
    hourlyStats,
    styleSamples,
  ] = await Promise.all([
    getFeeds(),
    getAllFeedPosts(100),
    getProspects({ platform: "linkedin" }),
    getUnipileStatus(),
    getRecommendations(),
    supabase
      .from("linkedin_comment_history")
      .select("*")
      .eq("user_id", user.id)
      .gt("replies_count", 0)
      .order("posted_at", { ascending: false })
      .limit(50),
    getEngageStats(),
    getTopComments(10),
    getTopCreators(),
    getHourlyStats(),
    getStyleSamples(),
  ]);

  const liAccount = unipileStatus.accounts.find(
    (a) => a.provider.toUpperCase() === "LINKEDIN",
  );
  const unipileLinkedin = unipileStatus.configured
    ? { connected: !!liAccount, accountName: liAccount?.name }
    : null;

  return (
    <LinkedinUnifiedView
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      prospects={prospects as any}
      unipileLinkedin={unipileLinkedin}
      initialFeeds={feeds}
      initialPosts={posts}
      recommendations={recommendations}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      interactionComments={(commentsResult.data || []) as any}
      stats={stats}
      topComments={topComments}
      topCreators={topCreators}
      hourlyStats={hourlyStats}
      styleSamples={styleSamples}
    />
  );
}
