import { getFeedbackStats, getTeamMembersForFeedback } from "@/lib/actions/feedback";
import { createClient } from "@/lib/supabase/server";
import { FeedbackView } from "./feedback-view";

export default async function FeedbackPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user!.id).single();
  const stats = await getFeedbackStats();
  const members = profile?.role === "admin" || profile?.role === "manager"
    ? await getTeamMembersForFeedback()
    : [];
  return <FeedbackView stats={stats} members={members} userRole={profile?.role || "setter"} userId={user!.id} />;
}
