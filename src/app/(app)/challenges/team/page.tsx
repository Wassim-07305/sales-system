import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TeamChallengesView } from "./team-challenges-view";

export default async function TeamChallengesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch team challenges
  const { data: challenges } = await supabase
    .from("challenges")
    .select("*")
    .eq("is_team", true)
    .eq("is_active", true)
    .order("end_date", { ascending: true });

  // Fetch all progress for team challenges
  const challengeIds = (challenges || []).map((c) => c.id);

  const progressMap: Record<
    string,
    { total: number; contributions: Array<{ user_id: string; full_name: string | null; value: number }> }
  > = {};

  if (challengeIds.length > 0) {
    const { data: allProgress } = await supabase
      .from("challenge_progress")
      .select("*, user:profiles(full_name)")
      .in("challenge_id", challengeIds);

    for (const p of allProgress || []) {
      if (!progressMap[p.challenge_id]) {
        progressMap[p.challenge_id] = { total: 0, contributions: [] };
      }
      progressMap[p.challenge_id].total += p.current_value || 0;
      const userName = Array.isArray(p.user)
        ? p.user[0]?.full_name
        : p.user?.full_name;
      progressMap[p.challenge_id].contributions.push({
        user_id: p.user_id,
        full_name: userName || null,
        value: p.current_value || 0,
      });
    }
  }

  return (
    <TeamChallengesView
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      challenges={(challenges || []) as any}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      progressMap={progressMap as any}
    />
  );
}
