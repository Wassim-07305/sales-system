import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ChallengesView } from "./challenges-view";
import { BADGE_DEFINITIONS } from "@/lib/badge-definitions";
import {
  getAllChallengesForAdmin,
  getPastChallenges,
} from "@/lib/actions/gamification";

export default async function ChallengesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profileCheck } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (
    !profileCheck ||
    !["admin", "manager", "setter", "closer"].includes(profileCheck.role)
  ) {
    redirect("/dashboard");
  }

  const isAdmin = ["admin", "manager"].includes(profileCheck.role);

  // Get gamification profile
  let { data: gamProfile } = await supabase
    .from("gamification_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  // Auto-create if doesn't exist
  if (!gamProfile) {
    const { data: newProfile } = await supabase
      .from("gamification_profiles")
      .insert({ user_id: user.id })
      .select()
      .single();
    gamProfile = newProfile;
  }

  // Get active challenges with user progress
  const { data: challenges } = await supabase
    .from("challenges")
    .select("*")
    .eq("is_active", true)
    .order("end_date", { ascending: true });

  const { data: progress } = await supabase
    .from("challenge_progress")
    .select("*")
    .eq("user_id", user.id);

  const progressMap: Record<
    string,
    { current_value: number; completed: boolean }
  > = {};
  for (const p of progress || []) {
    progressMap[p.challenge_id] = {
      current_value: p.current_value,
      completed: p.completed,
    };
  }

  // Leaderboard
  const { data: leaderboard } = await supabase
    .from("gamification_profiles")
    .select("*, user:profiles(full_name, avatar_url)")
    .order("total_points", { ascending: false })
    .limit(10);

  // Admin: all challenges for management
  const adminChallenges = isAdmin ? await getAllChallengesForAdmin() : [];

  // Past challenges for history tab
  const pastChallenges = await getPastChallenges("all");

  return (
    <ChallengesView
      gamProfile={gamProfile}
      challenges={challenges || []}
      progressMap={progressMap}
      leaderboard={leaderboard || []}
      currentUserId={user.id}
      allBadges={BADGE_DEFINITIONS}
      isAdmin={isAdmin}
      adminChallenges={adminChallenges}
      pastChallenges={pastChallenges}
    />
  );
}
