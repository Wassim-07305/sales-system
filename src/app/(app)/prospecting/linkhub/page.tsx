import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getFeeds, getAllFeedPosts, getRecommendations } from "@/lib/actions/linkedin-engage";
import { getProspects } from "@/lib/actions/prospecting";
import { getUnipileStatus } from "@/lib/actions/unipile";
import { LinkedinView } from "../linkedin/linkedin-view";

export default async function HubPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [feeds, posts, prospects, unipileStatus, recommendations, commentsResult] =
    await Promise.all([
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
    ]);

  const liAccount = unipileStatus.accounts.find(
    (a) => a.provider.toUpperCase() === "LINKEDIN",
  );
  const unipileLinkedin = unipileStatus.configured
    ? { connected: !!liAccount, accountName: liAccount?.name }
    : null;

  return (
    <LinkedinView
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      prospects={prospects as any}
      unipileLinkedin={unipileLinkedin}
      initialFeeds={feeds}
      initialPosts={posts}
      recommendations={recommendations}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      interactionComments={(commentsResult.data || []) as any}
    />
  );
}
