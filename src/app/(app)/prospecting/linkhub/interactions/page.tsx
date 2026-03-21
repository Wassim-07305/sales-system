import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getRecommendations } from "@/lib/actions/linkedin-engage";
import { InteractionsView } from "./interactions-view";

export default async function InteractionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [recommendations, commentsWithReplies] = await Promise.all([
    getRecommendations(),
    supabase
      .from("linkedin_comment_history")
      .select("*")
      .eq("user_id", user.id)
      .gt("replies_count", 0)
      .order("posted_at", { ascending: false })
      .limit(50)
      .then(({ data }) => data || []),
  ]);

  return (
    <InteractionsView
      recommendations={recommendations}
      comments={commentsWithReplies}
    />
  );
}
