import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { LeaderboardView } from "./leaderboard-view";

export default async function LeaderboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: leaderboard } = await supabase
    .from("gamification_profiles")
    .select("*, user:profiles(full_name, avatar_url, role)")
    .order("total_points", { ascending: false })
    .limit(50);

  return (
    <LeaderboardView
      leaderboard={leaderboard || []}
      currentUserId={user.id}
    />
  );
}
