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
    .select("dm_sent, dm_target")
    .eq("user_id", setterId)
    .order("date", { ascending: false })
    .limit(30);

  let messageQuality = 30;
  if (dmQuotas && dmQuotas.length > 0) {
    const avgCompletion =
      dmQuotas.reduce((sum, q) => {
        const target = q.dm_target || 1;
        return sum + Math.min((q.dm_sent || 0) / target, 1);
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

  // 4. Volume — based on prospects count
  const { count: prospectsCount } = await supabase
    .from("prospects")
    .select("*", { count: "exact", head: true })
    .eq("setter_id", setterId);

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

  // 6. Response rate — from daily quotas (responses vs targets)
  const { data: recentQuotas } = await supabase
    .from("daily_quotas")
    .select("calls_made, calls_target")
    .eq("user_id", setterId)
    .order("date", { ascending: false })
    .limit(14);

  let responseRate = 30;
  if (recentQuotas && recentQuotas.length > 0) {
    const avgRate =
      recentQuotas.reduce((sum, q) => {
        const target = q.calls_target || 1;
        return sum + Math.min((q.calls_made || 0) / target, 1);
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
