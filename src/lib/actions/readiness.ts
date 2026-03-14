"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { notify, notifyMany } from "@/lib/actions/notifications";

export interface ReadinessBreakdown {
  courseCompletion: number;    // 0-100 — weight 40%
  quizPerformance: number;    // 0-100 — weight 25%
  roleplayScore: number;      // 0-100 — weight 20%
  onboardingDone: number;     // 0-100 — weight 15%
  overall: number;            // 0-100 weighted total
  isReady: boolean;           // overall >= 80
  details: {
    coursesCompleted: number;
    coursesTotal: number;
    quizzesPassed: number;
    quizzesTotal: number;
    averageQuizScore: number;
    roleplaySessionsDone: number;
    roleplayMinRequired: number;
    averageRoleplayScore: number;
    onboardingStepsCompleted: number;
    onboardingStepsTotal: number;
  };
}

/**
 * Calculate readiness score for a setter/client.
 * Determines if they are "ready to be placed" with an entrepreneur.
 *
 * Criteria (from cahier des charges):
 * - Course completion: 40% weight
 * - Quiz performance: 25% weight
 * - Roleplay sessions: 20% weight
 * - Onboarding completion: 15% weight
 */
export async function calculateReadinessScore(userId: string): Promise<ReadinessBreakdown> {
  const supabase = await createClient();

  // ------------------------------------------------------------------
  // 1. COURSE COMPLETION (40%)
  // ------------------------------------------------------------------
  const { data: allLessons } = await supabase
    .from("lessons")
    .select("id");

  const totalLessons = allLessons?.length || 0;

  const { count: completedLessonsCount } = await supabase
    .from("lesson_progress")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("completed", true);

  const completedLessons = completedLessonsCount || 0;
  const courseCompletion = totalLessons > 0
    ? Math.round((completedLessons / totalLessons) * 100)
    : 0;

  // ------------------------------------------------------------------
  // 2. QUIZ PERFORMANCE (25%)
  // ------------------------------------------------------------------
  const { data: quizzes } = await supabase
    .from("quizzes")
    .select("id");

  const totalQuizzes = quizzes?.length || 0;

  const { data: quizAttempts } = await supabase
    .from("quiz_attempts")
    .select("quiz_id, score, passed")
    .eq("user_id", userId)
    .order("score", { ascending: false });

  // Best score per quiz
  const bestByQuiz = new Map<string, { score: number; passed: boolean }>();
  for (const attempt of quizAttempts || []) {
    if (!bestByQuiz.has(attempt.quiz_id) || attempt.score > bestByQuiz.get(attempt.quiz_id)!.score) {
      bestByQuiz.set(attempt.quiz_id, { score: attempt.score, passed: attempt.passed });
    }
  }

  const quizzesPassed = [...bestByQuiz.values()].filter((q) => q.passed).length;
  const averageQuizScore = bestByQuiz.size > 0
    ? Math.round([...bestByQuiz.values()].reduce((sum, q) => sum + q.score, 0) / bestByQuiz.size)
    : 0;

  const quizPerformance = totalQuizzes > 0
    ? Math.round((quizzesPassed / totalQuizzes) * 100)
    : (averageQuizScore > 0 ? averageQuizScore : 0);

  // ------------------------------------------------------------------
  // 3. ROLEPLAY SESSIONS (20%)
  // ------------------------------------------------------------------
  const ROLEPLAY_MIN_REQUIRED = 5;

  const { data: roleplaySessions } = await supabase
    .from("roleplay_sessions")
    .select("id, score, status")
    .eq("user_id", userId)
    .eq("status", "completed");

  const roleplayDone = roleplaySessions?.length || 0;
  const averageRoleplayScore = roleplayDone > 0
    ? Math.round(
        (roleplaySessions || []).reduce((sum, s) => sum + (s.score || 0), 0) / roleplayDone
      )
    : 0;

  // Score = min(sessions done / required, 1) * avg_score_factor
  const sessionRatio = Math.min(roleplayDone / ROLEPLAY_MIN_REQUIRED, 1);
  const scoreFactor = averageRoleplayScore >= 70 ? 1 : averageRoleplayScore >= 50 ? 0.8 : 0.6;
  const roleplayScore = Math.round(sessionRatio * scoreFactor * 100);

  // ------------------------------------------------------------------
  // 4. ONBOARDING (15%)
  // ------------------------------------------------------------------
  const { data: allOnboardingSteps } = await supabase
    .from("onboarding_steps")
    .select("id")
    .eq("is_required", true);

  const totalOnboardingSteps = allOnboardingSteps?.length || 0;

  const { count: completedOnboardingCount } = await supabase
    .from("client_onboarding")
    .select("*", { count: "exact", head: true })
    .eq("client_id", userId)
    .eq("completed", true);

  const completedOnboarding = completedOnboardingCount || 0;
  const onboardingDone = totalOnboardingSteps > 0
    ? Math.round((completedOnboarding / totalOnboardingSteps) * 100)
    : 100; // If no steps configured, consider done

  // ------------------------------------------------------------------
  // WEIGHTED TOTAL
  // ------------------------------------------------------------------
  const overall = Math.round(
    courseCompletion * 0.40 +
    quizPerformance * 0.25 +
    roleplayScore * 0.20 +
    onboardingDone * 0.15
  );

  const isReady = overall >= 80;

  return {
    courseCompletion,
    quizPerformance,
    roleplayScore,
    onboardingDone,
    overall,
    isReady,
    details: {
      coursesCompleted: completedLessons,
      coursesTotal: totalLessons,
      quizzesPassed,
      quizzesTotal: totalQuizzes,
      averageQuizScore,
      roleplaySessionsDone: roleplayDone,
      roleplayMinRequired: ROLEPLAY_MIN_REQUIRED,
      averageRoleplayScore,
      onboardingStepsCompleted: completedOnboarding,
      onboardingStepsTotal: totalOnboardingSteps,
    },
  };
}

/**
 * Recalculate readiness and update the profile if threshold is reached.
 * Also sends a notification to admins when a setter becomes ready.
 */
export async function updateReadinessStatus(userId: string): Promise<ReadinessBreakdown> {
  const supabase = await createClient();
  const readiness = await calculateReadinessScore(userId);

  // Get current status
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_ready_to_place, full_name, role")
    .eq("id", userId)
    .single();

  const wasReady = profile?.is_ready_to_place || false;

  // Update profile
  await supabase
    .from("profiles")
    .update({
      is_ready_to_place: readiness.isReady,
      setter_maturity_score: readiness.overall,
    })
    .eq("id", userId);

  // Notify admins when a setter BECOMES ready (transition from false to true)
  if (readiness.isReady && !wasReady) {
    const { data: admins } = await supabase
      .from("profiles")
      .select("id")
      .in("role", ["admin", "manager"]);

    const adminIds = (admins || []).map((a) => a.id);
    if (adminIds.length > 0) {
      await notifyMany(adminIds, "Setter pret a etre place !", `${profile?.full_name || "Un setter"} a atteint ${readiness.overall}% de preparation et est pret a etre place aupres d'un entrepreneur.`, { type: "placement_ready", link: "/team" });
    }

    // Also notify the setter themselves
    await notify(userId, "Felicitations ! Tu es pret a etre place !", `Tu as atteint ${readiness.overall}% de preparation. L'equipe va te contacter pour ton placement aupres d'un entrepreneur.`, { type: "placement_ready", link: "/dashboard" });
  }

  revalidatePath("/dashboard");
  revalidatePath("/team");

  return readiness;
}
