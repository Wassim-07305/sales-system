import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getFeeds, getAllFeedPosts } from "@/lib/actions/linkedin-engage";
import { SessionView } from "./session-view";

export default async function SessionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [feeds, posts] = await Promise.all([
    getFeeds(),
    getAllFeedPosts(50),
  ]);

  return <SessionView feeds={feeds} posts={posts} />;
}
