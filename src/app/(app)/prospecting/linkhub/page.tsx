import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getFeeds, getAllFeedPosts } from "@/lib/actions/linkedin-engage";
import { getProspects } from "@/lib/actions/prospecting";
import { getUnipileStatus } from "@/lib/actions/unipile";
import { LinkedInHubView } from "./linkedin-hub-view";

export default async function HubPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [feeds, posts, prospects, unipileStatus] = await Promise.all([
    getFeeds(),
    getAllFeedPosts(100),
    getProspects({ platform: "linkedin" }),
    getUnipileStatus(),
  ]);

  const liAccount = unipileStatus.accounts.find(
    (a) => a.provider.toUpperCase() === "LINKEDIN",
  );
  const unipileLinkedin = unipileStatus.configured
    ? { connected: !!liAccount, accountName: liAccount?.name }
    : null;

  return (
    <LinkedInHubView
      initialFeeds={feeds}
      initialPosts={posts}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      prospects={prospects as any}
      unipileLinkedin={unipileLinkedin}
    />
  );
}
