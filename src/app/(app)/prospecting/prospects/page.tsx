import { createClient } from "@/lib/supabase/server";
import {
  getProspects,
  getProspectLists,
  getProspectSegmentStats,
  getDailyQuota,
} from "@/lib/actions/prospecting";
import { getUnipileStatus } from "@/lib/actions/unipile";
import {
  getFeeds,
  getAllFeedPosts,
  getRecommendations,
} from "@/lib/actions/linkedin-engage";
import { ProspectsPageWrapper } from "./prospects-page-wrapper";

export default async function ProspectsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [
    prospects,
    lists,
    segmentStats,
    quota,
    unipileStatus,
    linkedinProspects,
    instagramProspects,
    feeds,
    posts,
    recommendations,
    interactionComments,
  ] = await Promise.all([
    getProspects(),
    getProspectLists(),
    getProspectSegmentStats(),
    getDailyQuota(),
    getUnipileStatus(),
    getProspects({ platform: "linkedin" }),
    getProspects({ platform: "instagram" }),
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
  ]);

  // Extract Unipile connection status per platform
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const accounts = (unipileStatus as any)?.accounts ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const liAccount = accounts.find((a: any) => a.provider === "LINKEDIN");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const igAccount = accounts.find((a: any) => a.provider === "INSTAGRAM");

  const unipileLinkedin = liAccount
    ? { connected: true, accountName: liAccount.name }
    : { connected: false };
  const unipileInstagram = igAccount
    ? { connected: true, accountName: igAccount.name }
    : { connected: false };

  return (
    <div className="pb-8">
      <ProspectsPageWrapper
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        prospects={(prospects ?? []) as any}
        lists={lists ?? []}
        segmentStats={segmentStats}
        quota={quota}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        linkedinProspects={(linkedinProspects ?? []) as any}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        instagramProspects={(instagramProspects ?? []) as any}
        unipileLinkedin={unipileLinkedin}
        unipileInstagram={unipileInstagram}
        initialFeeds={feeds}
        initialPosts={posts}
        recommendations={recommendations}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        interactionComments={interactionComments as any}
      />
    </div>
  );
}
