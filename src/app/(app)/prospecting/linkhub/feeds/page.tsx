import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getFeeds, getAllFeedPosts } from "@/lib/actions/linkedin-engage";
import { FeedsView } from "./feeds-view";

export default async function FeedsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [feeds, posts] = await Promise.all([
    getFeeds(),
    getAllFeedPosts(100),
  ]);

  return <FeedsView initialFeeds={feeds} initialPosts={posts} />;
}
