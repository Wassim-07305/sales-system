"use server";

import { createClient } from "@/lib/supabase/server";

export async function calculateHealthScore(clientId: string): Promise<number> {
  const supabase = await createClient();

  // 1. Last connection (25%)
  const { data: profile } = await supabase
    .from("profiles")
    .select("updated_at")
    .eq("id", clientId)
    .single();

  let connectionScore = 20;
  if (profile?.updated_at) {
    const daysSince = Math.floor(
      (Date.now() - new Date(profile.updated_at).getTime()) / (1000 * 60 * 60 * 24)
    );
    connectionScore = daysSince < 3 ? 100 : daysSince < 7 ? 60 : 20;
  }

  // 2. Group call attendance (25%)
  const { data: calls } = await supabase
    .from("group_calls")
    .select("id")
    .gte("scheduled_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

  let attendanceScore = 20;
  if (calls && calls.length > 0) {
    const { count } = await supabase
      .from("group_call_attendance")
      .select("*", { count: "exact", head: true })
      .eq("user_id", clientId)
      .eq("status", "attended")
      .in("call_id", calls.map((c) => c.id));

    const rate = ((count || 0) / calls.length) * 100;
    attendanceScore = rate > 80 ? 100 : rate > 50 ? 60 : 20;
  }

  // 3. Training progress (25%)
  const { data: lessons } = await supabase
    .from("lessons")
    .select("id");

  let trainingScore = 20;
  if (lessons && lessons.length > 0) {
    const { count } = await supabase
      .from("lesson_progress")
      .select("*", { count: "exact", head: true })
      .eq("user_id", clientId)
      .eq("completed", true);

    const rate = ((count || 0) / lessons.length) * 100;
    trainingScore = rate > 70 ? 100 : rate > 30 ? 60 : 20;
  }

  // 4. Message responsiveness (25%)
  const { data: recentMessages } = await supabase
    .from("messages")
    .select("created_at")
    .eq("sender_id", clientId)
    .order("created_at", { ascending: false })
    .limit(1);

  let responsivenessScore = 20;
  if (recentMessages && recentMessages.length > 0) {
    const hoursSince = Math.floor(
      (Date.now() - new Date(recentMessages[0].created_at).getTime()) / (1000 * 60 * 60)
    );
    responsivenessScore = hoursSince < 24 ? 100 : hoursSince < 48 ? 60 : 20;
  }

  const healthScore = Math.round(
    (connectionScore * 0.25) +
    (attendanceScore * 0.25) +
    (trainingScore * 0.25) +
    (responsivenessScore * 0.25)
  );

  // Update profile
  await supabase
    .from("profiles")
    .update({ health_score: healthScore })
    .eq("id", clientId);

  // Alert if below 40
  if (healthScore < 40) {
    const { data: admins } = await supabase
      .from("profiles")
      .select("id")
      .in("role", ["admin", "manager"]);

    if (admins) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", clientId)
        .single();

      for (const admin of admins) {
        // Check if alert already sent recently
        const { data: existing } = await supabase
          .from("notifications")
          .select("id")
          .eq("user_id", admin.id)
          .eq("type", "health_alert")
          .ilike("body", `%${clientId}%`)
          .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .limit(1);

        if (!existing || existing.length === 0) {
          await supabase.from("notifications").insert({
            user_id: admin.id,
            title: "Client en zone rouge",
            body: `${profile?.full_name || "Un client"} a un health score de ${healthScore}. ${clientId}`,
            type: "health_alert",
            link: "/customers",
          });
        }
      }
    }
  }

  return healthScore;
}

export async function recalculateAllHealthScores() {
  const supabase = await createClient();

  const { data: clients } = await supabase
    .from("profiles")
    .select("id")
    .in("role", ["client_b2b", "client_b2c"]);

  if (!clients) return;

  for (const client of clients) {
    await calculateHealthScore(client.id);
  }
}
