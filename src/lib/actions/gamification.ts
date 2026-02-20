"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const LEVELS = [
  { level: 1, name: "Setter Débutant", minPoints: 0 },
  { level: 2, name: "Setter Confirmé", minPoints: 100 },
  { level: 3, name: "Setter Senior", minPoints: 300 },
  { level: 4, name: "Setter Elite", minPoints: 600 },
  { level: 5, name: "Setter Légende", minPoints: 1000 },
];

function getLevelForPoints(points: number) {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (points >= LEVELS[i].minPoints) return LEVELS[i];
  }
  return LEVELS[0];
}

export async function addPoints(userId: string, points: number, reason: string) {
  const supabase = await createClient();

  // Get or create gamification profile
  let { data: profile } = await supabase
    .from("gamification_profiles")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (!profile) {
    const { data: newProfile } = await supabase
      .from("gamification_profiles")
      .insert({ user_id: userId })
      .select()
      .single();
    profile = newProfile;
  }

  if (!profile) return;

  const newTotal = profile.total_points + points;
  const oldLevel = getLevelForPoints(profile.total_points);
  const newLevel = getLevelForPoints(newTotal);

  await supabase
    .from("gamification_profiles")
    .update({
      total_points: newTotal,
      level: newLevel.level,
      level_name: newLevel.name,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  // Level up notification
  if (newLevel.level > oldLevel.level) {
    await supabase.from("notifications").insert({
      user_id: userId,
      title: `Niveau ${newLevel.level} atteint !`,
      body: `Félicitations ! Vous êtes maintenant ${newLevel.name} avec ${newTotal} points.`,
      type: "level_up",
      link: "/challenges",
    });
  }

  // Regular points notification
  await supabase.from("notifications").insert({
    user_id: userId,
    title: `+${points} points`,
    body: reason,
    type: "points",
    link: "/challenges",
  });

  revalidatePath("/challenges");
  revalidatePath("/team/leaderboard");
}

export async function updateChallengeProgress(userId: string, metric: string, value: number) {
  const supabase = await createClient();

  // Get active challenges for this metric
  const { data: challenges } = await supabase
    .from("challenges")
    .select("*")
    .eq("metric", metric)
    .eq("is_active", true);

  if (!challenges) return;

  for (const challenge of challenges) {
    // Get or create progress
    let { data: progress } = await supabase
      .from("challenge_progress")
      .select("*")
      .eq("user_id", userId)
      .eq("challenge_id", challenge.id)
      .single();

    if (!progress) {
      const { data: newProgress } = await supabase
        .from("challenge_progress")
        .insert({ user_id: userId, challenge_id: challenge.id, current_value: 0 })
        .select()
        .single();
      progress = newProgress;
    }

    if (!progress || progress.completed) continue;

    const newValue = Math.min(value, challenge.target_value);
    const justCompleted = newValue >= challenge.target_value && !progress.completed;

    await supabase
      .from("challenge_progress")
      .update({
        current_value: newValue,
        completed: justCompleted || progress.completed,
        completed_at: justCompleted ? new Date().toISOString() : progress.completed_at,
      })
      .eq("id", progress.id);

    // Award points on completion
    if (justCompleted) {
      await addPoints(userId, challenge.points_reward, `Défi complété : ${challenge.title}`);
    }
  }

  revalidatePath("/challenges");
}
