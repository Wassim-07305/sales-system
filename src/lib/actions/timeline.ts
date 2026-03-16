"use server";

import { createClient } from "@/lib/supabase/server";

export type TimelineEventType =
  | "signup"
  | "onboarding"
  | "lesson_completed"
  | "quiz_passed"
  | "quiz_failed"
  | "roleplay_completed"
  | "booking"
  | "journal"
  | "message_sent"
  | "deal_activity"
  | "placement_ready"
  | "challenge_completed";

export interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  title: string;
  description: string;
  date: string;
  metadata?: Record<string, unknown>;
}

/**
 * Aggregate a complete chronological timeline for a client/setter.
 * Pulls from: lesson_progress, quiz_attempts, roleplay_sessions,
 * bookings, daily_journals, deal_activities, client_onboarding, etc.
 */
export async function getClientTimeline(
  userId: string,
  limit = 50,
): Promise<TimelineEvent[]> {
  const supabase = await createClient();
  const events: TimelineEvent[] = [];

  // ------------------------------------------------------------------
  // 1. Account creation (from profiles)
  // ------------------------------------------------------------------
  const { data: profile } = await supabase
    .from("profiles")
    .select("created_at, full_name")
    .eq("id", userId)
    .single();

  if (profile) {
    events.push({
      id: `signup-${userId}`,
      type: "signup",
      title: "Inscription",
      description: `${profile.full_name || "Utilisateur"} a rejoint la plateforme.`,
      date: profile.created_at,
    });
  }

  // ------------------------------------------------------------------
  // 2. Onboarding steps completed
  // ------------------------------------------------------------------
  const { data: onboardingSteps } = await supabase
    .from("client_onboarding")
    .select("step_id, completed_at, onboarding_steps(title)")
    .eq("client_id", userId)
    .eq("completed", true)
    .order("completed_at", { ascending: false });

  for (const step of onboardingSteps || []) {
    const stepInfo = Array.isArray(step.onboarding_steps)
      ? step.onboarding_steps[0]
      : step.onboarding_steps;
    events.push({
      id: `onboarding-${step.step_id}`,
      type: "onboarding",
      title: "Etape d'onboarding terminee",
      description:
        (stepInfo as { title: string } | null)?.title || "Etape completee",
      date: step.completed_at,
    });
  }

  // ------------------------------------------------------------------
  // 3. Lessons completed
  // ------------------------------------------------------------------
  const { data: lessonProgress } = await supabase
    .from("lesson_progress")
    .select("lesson_id, completed_at, lessons(title, courses(title))")
    .eq("user_id", userId)
    .eq("completed", true)
    .order("completed_at", { ascending: false })
    .limit(30);

  for (const lp of lessonProgress || []) {
    const lesson = Array.isArray(lp.lessons) ? lp.lessons[0] : lp.lessons;
    const lessonData = lesson as {
      title: string;
      courses: { title: string } | { title: string }[] | null;
    } | null;
    const courseTitle = lessonData?.courses
      ? Array.isArray(lessonData.courses)
        ? lessonData.courses[0]?.title
        : lessonData.courses.title
      : null;

    events.push({
      id: `lesson-${lp.lesson_id}`,
      type: "lesson_completed",
      title: "Lecon terminee",
      description: `${lessonData?.title || "Lecon"}${courseTitle ? ` (${courseTitle})` : ""}`,
      date: lp.completed_at || new Date().toISOString(),
      metadata: { lessonId: lp.lesson_id },
    });
  }

  // ------------------------------------------------------------------
  // 4. Quiz attempts
  // ------------------------------------------------------------------
  const { data: quizAttempts } = await supabase
    .from("quiz_attempts")
    .select("id, score, passed, attempted_at, quizzes(title)")
    .eq("user_id", userId)
    .order("attempted_at", { ascending: false })
    .limit(20);

  for (const qa of quizAttempts || []) {
    const quiz = Array.isArray(qa.quizzes) ? qa.quizzes[0] : qa.quizzes;
    events.push({
      id: `quiz-${qa.id}`,
      type: qa.passed ? "quiz_passed" : "quiz_failed",
      title: qa.passed ? "Quiz reussi" : "Quiz echoue",
      description: `${(quiz as { title: string } | null)?.title || "Quiz"} — Score : ${qa.score}%`,
      date: qa.attempted_at,
      metadata: { score: qa.score, passed: qa.passed },
    });
  }

  // ------------------------------------------------------------------
  // 5. Roleplay sessions completed
  // ------------------------------------------------------------------
  const { data: roleplaySessions } = await supabase
    .from("roleplay_sessions")
    .select(
      "id, score, ended_at, prospect_profile_id, roleplay_prospect_profiles(name)",
    )
    .eq("user_id", userId)
    .eq("status", "completed")
    .order("ended_at", { ascending: false })
    .limit(15);

  for (const rs of roleplaySessions || []) {
    const prospect = Array.isArray(rs.roleplay_prospect_profiles)
      ? rs.roleplay_prospect_profiles[0]
      : rs.roleplay_prospect_profiles;
    events.push({
      id: `roleplay-${rs.id}`,
      type: "roleplay_completed",
      title: "Session roleplay terminee",
      description: `Prospect : ${(prospect as { name: string } | null)?.name || "Inconnu"} — Score : ${rs.score || 0}%`,
      date: rs.ended_at || new Date().toISOString(),
      metadata: { score: rs.score, sessionId: rs.id },
    });
  }

  // ------------------------------------------------------------------
  // 6. Bookings
  // ------------------------------------------------------------------
  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, prospect_name, scheduled_at, slot_type, status")
    .or(`user_id.eq.${userId}`)
    .order("scheduled_at", { ascending: false })
    .limit(15);

  for (const b of bookings || []) {
    events.push({
      id: `booking-${b.id}`,
      type: "booking",
      title: "Rendez-vous",
      description: `${b.slot_type || "Appel"} avec ${b.prospect_name || "Prospect"} — ${b.status || "confirme"}`,
      date: b.scheduled_at,
      metadata: { status: b.status, type: b.slot_type },
    });
  }

  // ------------------------------------------------------------------
  // 7. Daily journals (last 10)
  // ------------------------------------------------------------------
  const { data: journals } = await supabase
    .from("daily_journals")
    .select("id, date, mood, wins")
    .eq("user_id", userId)
    .order("date", { ascending: false })
    .limit(10);

  for (const j of journals || []) {
    const moodEmoji = j.mood >= 4 ? "😊" : j.mood >= 3 ? "😐" : "😔";
    events.push({
      id: `journal-${j.id}`,
      type: "journal",
      title: "Journal du jour",
      description: `${moodEmoji} Humeur : ${j.mood}/5${j.wins ? ` — ${j.wins.substring(0, 60)}` : ""}`,
      date: `${j.date}T12:00:00.000Z`,
      metadata: { mood: j.mood },
    });
  }

  // ------------------------------------------------------------------
  // 8. Deal activities
  // ------------------------------------------------------------------
  const { data: dealActivities } = await supabase
    .from("deal_activities")
    .select("id, type, content, created_at, deals(title)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(15);

  for (const da of dealActivities || []) {
    const deal = Array.isArray(da.deals) ? da.deals[0] : da.deals;
    events.push({
      id: `deal-${da.id}`,
      type: "deal_activity",
      title: `Activite : ${da.type}`,
      description: `${(deal as { title: string } | null)?.title || "Deal"}${da.content ? ` — ${da.content.substring(0, 80)}` : ""}`,
      date: da.created_at,
      metadata: { activityType: da.type },
    });
  }

  // ------------------------------------------------------------------
  // Sort all events by date (most recent first) and limit
  // ------------------------------------------------------------------
  events.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  return events.slice(0, limit);
}
