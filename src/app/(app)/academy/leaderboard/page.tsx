import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getAcademyLeaderboard } from "@/lib/actions/academy";
import { LeaderboardView } from "./leaderboard-view";

export default async function AcademyLeaderboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const leaderboard = await getAcademyLeaderboard();

  return <LeaderboardView leaderboard={leaderboard} />;
}
