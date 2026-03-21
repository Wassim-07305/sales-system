import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RepliesView } from "./replies-view";

export default async function RepliesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Get recent comments with replies
  const { data: commentsWithReplies } = await supabase
    .from("linkedin_comment_history")
    .select("*")
    .eq("user_id", user.id)
    .gt("replies_count", 0)
    .order("posted_at", { ascending: false })
    .limit(50);

  return <RepliesView comments={commentsWithReplies || []} />;
}
