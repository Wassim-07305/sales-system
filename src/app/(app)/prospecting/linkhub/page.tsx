import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getFeeds, getAllFeedPosts } from "@/lib/actions/linkedin-engage";
import { LinkedInHubView } from "./linkedin-hub-view";

export default async function HubPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [feeds, posts] = await Promise.all([
    getFeeds(),
    getAllFeedPosts(100),
  ]);

  return <LinkedInHubView initialFeeds={feeds} initialPosts={posts} />;
}
