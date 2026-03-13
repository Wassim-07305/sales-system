"use server";

import { createClient } from "@/lib/supabase/server";

const WEIGHTS = {
  message_quality: 0.2,
  objection_handling: 0.15,
  consistency: 0.2,
  volume: 0.15,
  roleplay_performance: 0.15,
  response_rate: 0.15,
};

export async function calculateSetterMaturity(setterId: string) {
  const supabase = await createClient();

  // 1. Message quality — based on DM quotas completion
  const { data: dmQuotas } = await supabase
    .from("daily_quotas")
    .select("dms_sent, dms_target")
    .eq("user_id", setterId)
    .order("date", { ascending: false })
    .limit(30);

  let messageQuality = 30;
  if (dmQuotas && dmQuotas.length > 0) {
    const avgCompletion =
      dmQuotas.reduce((sum, q) => {
        const target = q.dms_target || 1;
        return sum + Math.min((q.dms_sent || 0) / target, 1);
      }, 0) / dmQuotas.length;
    messageQuality = Math.round(avgCompletion * 100);
  }

  // 2. Objection handling — based on roleplay sessions
  const { data: roleplaySessions } = await supabase
    .from("roleplay_sessions")
    .select("score")
    .eq("user_id", setterId)
    .not("score", "is", null)
    .order("created_at", { ascending: false })
    .limit(10);

  let objectionHandling = 30;
  if (roleplaySessions && roleplaySessions.length > 0) {
    const avgScore =
      roleplaySessions.reduce((sum, s) => sum + (s.score || 0), 0) /
      roleplaySessions.length;
    objectionHandling = Math.round(avgScore);
  }

  // 3. Consistency — based on daily journals presence
  const thirtyDaysAgo = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000
  ).toISOString();
  const { count: journalCount } = await supabase
    .from("daily_journals")
    .select("*", { count: "exact", head: true })
    .eq("user_id", setterId)
    .gte("created_at", thirtyDaysAgo);

  const consistency = Math.round(Math.min(((journalCount || 0) / 30) * 100, 100));

  // 4. Volume — based on prospects count (via prospect_lists owned by setter)
  const { data: setterLists } = await supabase
    .from("prospect_lists")
    .select("id")
    .eq("user_id", setterId);

  const listIds = (setterLists || []).map((l) => l.id);
  let prospectsCount: number | null = 0;
  if (listIds.length > 0) {
    const { count } = await supabase
      .from("prospects")
      .select("*", { count: "exact", head: true })
      .in("list_id", listIds);
    prospectsCount = count;
  }

  let volume = 30;
  if (prospectsCount !== null) {
    volume =
      prospectsCount >= 100
        ? 100
        : prospectsCount >= 50
          ? 80
          : prospectsCount >= 20
            ? 60
            : prospectsCount >= 10
              ? 40
              : 20;
  }

  // 5. Roleplay performance — average of latest roleplay scores
  let roleplayPerformance = 30;
  if (roleplaySessions && roleplaySessions.length >= 3) {
    const top5 = roleplaySessions.slice(0, 5);
    roleplayPerformance = Math.round(
      top5.reduce((sum, s) => sum + (s.score || 0), 0) / top5.length
    );
  }

  // 6. Response rate — based on replies vs DMs sent ratio
  const { data: recentQuotas } = await supabase
    .from("daily_quotas")
    .select("dms_sent, replies_received")
    .eq("user_id", setterId)
    .order("date", { ascending: false })
    .limit(14);

  let responseRate = 30;
  if (recentQuotas && recentQuotas.length > 0) {
    const avgRate =
      recentQuotas.reduce((sum, q) => {
        const sent = q.dms_sent || 1;
        return sum + Math.min((q.replies_received || 0) / sent, 1);
      }, 0) / recentQuotas.length;
    responseRate = Math.round(avgRate * 100);
  }

  // Calculate overall weighted average
  const overallScore = Math.round(
    messageQuality * WEIGHTS.message_quality +
      objectionHandling * WEIGHTS.objection_handling +
      consistency * WEIGHTS.consistency +
      volume * WEIGHTS.volume +
      roleplayPerformance * WEIGHTS.roleplay_performance +
      responseRate * WEIGHTS.response_rate
  );

  // Upsert into setter_maturity_scores
  const { data, error } = await supabase
    .from("setter_maturity_scores")
    .upsert(
      {
        setter_id: setterId,
        message_quality: messageQuality,
        objection_handling: objectionHandling,
        consistency,
        volume,
        roleplay_performance: roleplayPerformance,
        response_rate: responseRate,
        overall_score: overallScore,
        computed_at: new Date().toISOString(),
      },
      { onConflict: "setter_id" }
    )
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function getMaturityReport(setterId?: string) {
  const supabase = await createClient();

  if (setterId) {
    const { data } = await supabase
      .from("setter_maturity_scores")
      .select("*, setter:profiles(id, full_name, avatar_url)")
      .eq("setter_id", setterId)
      .single();

    return data ? [data] : [];
  }

  const { data } = await supabase
    .from("setter_maturity_scores")
    .select("*, setter:profiles(id, full_name, avatar_url)")
    .order("overall_score", { ascending: false });

  return data || [];
}

export async function getMaturityHistory(setterId: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .from("setter_maturity_scores")
    .select("*")
    .eq("setter_id", setterId)
    .order("computed_at", { ascending: false })
    .limit(10);

  return data || [];
}

// ── Indicateur "Prêt à Être Placé" (F12) ──────────────────────────

export async function getPlacementReadiness(userId?: string) {
  const supabase = await createClient();

  let targetUserId = userId;
  if (!targetUserId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    targetUserId = user.id;
  }

  // 1. Lesson completion percentage (weight: 40%)
  const { count: totalLessons } = await supabase
    .from("course_lessons")
    .select("id", { count: "exact", head: true });

  const { count: completedLessons } = await supabase
    .from("lesson_progress")
    .select("id", { count: "exact", head: true })
    .eq("user_id", targetUserId)
    .eq("completed", true);

  const modulesScore = totalLessons && totalLessons > 0
    ? Math.round(((completedLessons || 0) / totalLessons) * 100)
    : 0;

  // 2. Quiz scores average (weight: 25%)
  const { data: quizResults } = await supabase
    .from("quiz_results")
    .select("score")
    .eq("user_id", targetUserId);

  let quizzesScore = 0;
  if (quizResults && quizResults.length > 0) {
    quizzesScore = Math.round(
      quizResults.reduce((sum, q) => sum + (q.score || 0), 0) / quizResults.length
    );
  }

  // 3. Roleplay sessions completed (weight: 15%)
  const { count: roleplayCount } = await supabase
    .from("roleplay_sessions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", targetUserId);

  // Target: 10 sessions = 100%
  const roleplayScore = Math.min(Math.round(((roleplayCount || 0) / 10) * 100), 100);

  // 4. Daily journals submitted in last 7 days (weight: 10%)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const { count: journalCount } = await supabase
    .from("daily_journals")
    .select("id", { count: "exact", head: true })
    .eq("user_id", targetUserId)
    .gte("date", sevenDaysAgo.toISOString().split("T")[0]);

  const journalScore = Math.min(Math.round(((journalCount || 0) / 7) * 100), 100);

  // 5. Community participation — posts + comments (weight: 10%)
  const { count: postsCount } = await supabase
    .from("community_posts")
    .select("id", { count: "exact", head: true })
    .eq("author_id", targetUserId);

  const { count: commentsCount } = await supabase
    .from("community_comments")
    .select("id", { count: "exact", head: true })
    .eq("author_id", targetUserId);

  // Target: 20 contributions = 100%
  const communityScore = Math.min(
    Math.round((((postsCount || 0) + (commentsCount || 0)) / 20) * 100),
    100
  );

  // Weighted score
  const score = Math.round(
    modulesScore * 0.4 +
    quizzesScore * 0.25 +
    roleplayScore * 0.15 +
    journalScore * 0.1 +
    communityScore * 0.1
  );

  let level: "not_ready" | "almost" | "ready" | "placed";
  if (score < 40) level = "not_ready";
  else if (score < 70) level = "almost";
  else if (score < 90) level = "ready";
  else level = "placed";

  return {
    score,
    level,
    breakdown: {
      modules: modulesScore,
      quizzes: quizzesScore,
      roleplay: roleplayScore,
      journal: journalScore,
      community: communityScore,
    },
    isReady: score >= 80,
  };
}
