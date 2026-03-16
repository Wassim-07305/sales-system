"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { notify } from "@/lib/actions/notifications";

/**
 * Check for various alert conditions and create notifications.
 * Can be called periodically (cron) or on demand.
 */
export async function runSmartAlerts() {
  const supabase = await createClient();
  const now = new Date();
  const alerts: Array<{
    userId: string;
    title: string;
    body: string;
    type: string;
    link: string;
  }> = [];

  // ------------------------------------------------------------------
  // 1. STALE DEALS — No activity in 5+ days
  // ------------------------------------------------------------------
  const fiveDaysAgo = new Date(
    now.getTime() - 5 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { data: signedStage } = await supabase
    .from("pipeline_stages")
    .select("id")
    .eq("name", "Fermé (gagné)")
    .single();

  const { data: staleDeals } = await supabase
    .from("deals")
    .select("id, title, assigned_to, updated_at")
    .lt("updated_at", fiveDaysAgo)
    .not("stage_id", "eq", signedStage?.id || "none")
    .limit(20);

  for (const deal of staleDeals || []) {
    if (deal.assigned_to) {
      const daysSince = Math.floor(
        (now.getTime() - new Date(deal.updated_at).getTime()) /
          (1000 * 60 * 60 * 24),
      );
      alerts.push({
        userId: deal.assigned_to,
        title: "Deal inactif",
        body: `"${deal.title}" n'a pas eu d'activite depuis ${daysSince} jours. Pense a relancer !`,
        type: "stale_deal",
        link: "/crm",
      });
    }
  }

  // ------------------------------------------------------------------
  // 2. NO-SHOW BOOKINGS — Upcoming bookings in next 24h
  // ------------------------------------------------------------------
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
  const { data: upcomingBookings } = await supabase
    .from("bookings")
    .select("id, prospect_name, scheduled_at, user_id")
    .gte("scheduled_at", now.toISOString())
    .lte("scheduled_at", tomorrow)
    .eq("status", "confirmed");

  for (const booking of upcomingBookings || []) {
    if (booking.user_id) {
      alerts.push({
        userId: booking.user_id,
        title: "RDV dans moins de 24h",
        body: `Appel avec ${booking.prospect_name || "un prospect"} prevu demain. Prepare-toi !`,
        type: "upcoming_booking",
        link: "/bookings",
      });
    }
  }

  // ------------------------------------------------------------------
  // 3. LOW QUOTA — Setters below daily DM target
  // ------------------------------------------------------------------
  const today = now.toISOString().split("T")[0];
  const { data: quotas } = await supabase
    .from("daily_quotas")
    .select("user_id, dms_sent, dms_target")
    .eq("date", today);

  // Only alert in afternoon (after 14h)
  if (now.getHours() >= 14) {
    for (const quota of quotas || []) {
      const progress =
        quota.dms_target > 0 ? quota.dms_sent / quota.dms_target : 1;
      if (progress < 0.5) {
        alerts.push({
          userId: quota.user_id,
          title: "Objectif DM en retard",
          body: `Tu as envoye ${quota.dms_sent}/${quota.dms_target} DMs aujourd'hui. Accelere pour atteindre ton objectif !`,
          type: "low_quota",
          link: "/prospecting/hub",
        });
      }
    }
  }

  // ------------------------------------------------------------------
  // 4. STREAK AT RISK — Setter hasn't logged journal today
  // ------------------------------------------------------------------
  const { data: settersWithStreaks } = await supabase
    .from("gamification_profiles")
    .select("user_id, current_streak")
    .gt("current_streak", 2);

  for (const setter of settersWithStreaks || []) {
    const { data: todayJournal } = await supabase
      .from("daily_journals")
      .select("id")
      .eq("user_id", setter.user_id)
      .eq("date", today)
      .limit(1);

    if ((!todayJournal || todayJournal.length === 0) && now.getHours() >= 18) {
      alerts.push({
        userId: setter.user_id,
        title: "Streak en danger !",
        body: `Tu as une serie de ${setter.current_streak} jours. N'oublie pas ton journal du jour pour la maintenir !`,
        type: "streak_risk",
        link: "/dashboard",
      });
    }
  }

  // ------------------------------------------------------------------
  // 5. CLIENT HEALTH SCORE DROP — Admin alert
  // ------------------------------------------------------------------
  const { data: lowHealthClients } = await supabase
    .from("profiles")
    .select("id, full_name, health_score")
    .in("role", ["client_b2b", "client_b2c"])
    .lt("health_score", 30);

  if (lowHealthClients && lowHealthClients.length > 0) {
    const { data: admins } = await supabase
      .from("profiles")
      .select("id")
      .in("role", ["admin", "manager"]);

    for (const admin of admins || []) {
      alerts.push({
        userId: admin.id,
        title: `${lowHealthClients.length} client(s) en zone rouge`,
        body: `Clients avec health score < 30 : ${lowHealthClients.map((c) => c.full_name || "Inconnu").join(", ")}`,
        type: "health_alert",
        link: "/customers",
      });
    }
  }

  // ------------------------------------------------------------------
  // 6. INACTIVE CLIENTS — No login in 5+ days (B2C)
  // ------------------------------------------------------------------
  const { data: inactiveClients } = await supabase
    .from("profiles")
    .select("id, full_name, updated_at")
    .in("role", ["client_b2c"])
    .lt("updated_at", fiveDaysAgo);

  for (const client of inactiveClients || []) {
    // Alert admins
    const { data: inactiveAdmins } = await supabase
      .from("profiles")
      .select("id")
      .in("role", ["admin", "manager"])
      .limit(5);
    for (const admin of inactiveAdmins || []) {
      alerts.push({
        userId: admin.id,
        title: "Client inactif",
        body: `${client.full_name || "Un client B2C"} ne s'est pas connecté depuis plus de 5 jours.`,
        type: "inactive_client",
        link: "/customers",
      });
    }
  }

  // ------------------------------------------------------------------
  // 7. SETTER SANS JOURNAL 48H
  // ------------------------------------------------------------------
  const twoDaysAgo = new Date(
    now.getTime() - 2 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const { data: silentSetters } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("role", ["client_b2c"])
    .eq("onboarding_completed", true);

  for (const setter of silentSetters || []) {
    const { data: recentJournals } = await supabase
      .from("daily_journals")
      .select("id")
      .eq("user_id", setter.id)
      .gte("date", twoDaysAgo.split("T")[0])
      .limit(1);

    if (!recentJournals || recentJournals.length === 0) {
      const { data: silentAdmins } = await supabase
        .from("profiles")
        .select("id")
        .in("role", ["admin", "manager"])
        .limit(3);
      for (const admin of silentAdmins || []) {
        alerts.push({
          userId: admin.id,
          title: "Setter silencieux",
          body: `${setter.full_name || "Un setter"} n'a pas rempli son journal depuis 48h.`,
          type: "silent_setter",
          link: "/team",
        });
      }
    }
  }

  // ------------------------------------------------------------------
  // 8. 3 TESTS ECHOUES CONSECUTIFS
  // ------------------------------------------------------------------
  const { data: failedAttempts } = await supabase
    .from("quiz_attempts")
    .select("user_id, passed, created_at")
    .eq("passed", false)
    .gte("created_at", fiveDaysAgo)
    .order("created_at", { ascending: false });

  const failCounts: Record<string, number> = {};
  for (const a of failedAttempts || []) {
    failCounts[a.user_id] = (failCounts[a.user_id] || 0) + 1;
  }

  for (const [failUserId, count] of Object.entries(failCounts)) {
    if (count >= 3) {
      alerts.push({
        userId: failUserId,
        title: "Difficulté dans la formation",
        body: `Vous avez échoué ${count} tests récemment. N'hésitez pas à réviser avec les flashcards !`,
        type: "quiz_struggle",
        link: "/academy/revision",
      });
    }
  }

  // ------------------------------------------------------------------
  // DEDUPLICATE & INSERT
  // ------------------------------------------------------------------
  // Avoid spamming: don't send same alert type to same user within 24h
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  const uniqueAlerts: typeof alerts = [];
  for (const alert of alerts) {
    const { data: existing } = await supabase
      .from("notifications")
      .select("id")
      .eq("user_id", alert.userId)
      .eq("type", alert.type)
      .gte("created_at", oneDayAgo)
      .limit(1);

    if (!existing || existing.length === 0) {
      uniqueAlerts.push(alert);
    }
  }

  for (const a of uniqueAlerts) {
    await notify(a.userId, a.title, a.body, { type: a.type, link: a.link });
  }

  revalidatePath("/notifications");
  return { alertsSent: uniqueAlerts.length, totalChecked: alerts.length };
}

/**
 * Generate a weekly performance report for a setter.
 */
export async function generateWeeklyReport(userId: string) {
  const supabase = await createClient();
  const now = new Date();
  const weekAgo = new Date(
    now.getTime() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  // Deals this week
  const { data: weekDeals } = await supabase
    .from("deals")
    .select("id, value, stage_id")
    .eq("assigned_to", userId)
    .gte("created_at", weekAgo);

  // Bookings this week
  const { data: weekBookings } = await supabase
    .from("bookings")
    .select("id, status")
    .gte("scheduled_at", weekAgo)
    .lte("scheduled_at", now.toISOString());

  // DM quotas this week
  const { data: weekQuotas } = await supabase
    .from("daily_quotas")
    .select("dms_sent, replies_received, bookings_from_dms")
    .eq("user_id", userId)
    .gte("date", weekAgo.split("T")[0]);

  const totalDms = (weekQuotas || []).reduce((s, q) => s + q.dms_sent, 0);
  const totalReplies = (weekQuotas || []).reduce(
    (s, q) => s + q.replies_received,
    0,
  );
  const totalBookingsFromDms = (weekQuotas || []).reduce(
    (s, q) => s + q.bookings_from_dms,
    0,
  );
  const completedBookings = (weekBookings || []).filter(
    (b) => b.status === "completed",
  ).length;
  const showUpRate =
    weekBookings && weekBookings.length > 0
      ? Math.round((completedBookings / weekBookings.length) * 100)
      : 0;

  return {
    period: { from: weekAgo, to: now.toISOString() },
    metrics: {
      dealsCreated: (weekDeals || []).length,
      totalPipelineValue: (weekDeals || []).reduce(
        (s, d) => s + (d.value || 0),
        0,
      ),
      totalDmsSent: totalDms,
      totalReplies,
      replyRate: totalDms > 0 ? Math.round((totalReplies / totalDms) * 100) : 0,
      bookingsFromDms: totalBookingsFromDms,
      totalBookings: (weekBookings || []).length,
      showUpRate,
      completedBookings,
    },
  };
}

/**
 * Generate and send a monthly value report to each B2C client.
 * Summarizes accomplishments and projects next month.
 */
export async function sendMonthlyValueReports() {
  const supabase = await createClient();
  const now = new Date();
  const startOfMonth = new Date(
    now.getFullYear(),
    now.getMonth(),
    1,
  ).toISOString();
  const startOfPrevMonth = new Date(
    now.getFullYear(),
    now.getMonth() - 1,
    1,
  ).toISOString();

  // Get all active B2C clients
  const { data: clients } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .in("role", ["client_b2b", "client_b2c"]);

  if (!clients || clients.length === 0) return { sent: 0 };

  let sentCount = 0;

  for (const client of clients) {
    // Check if already sent this month
    const { data: existingReport } = await supabase
      .from("notifications")
      .select("id")
      .eq("user_id", client.id)
      .eq("type", "monthly_value_report")
      .gte("created_at", startOfMonth)
      .limit(1);

    if (existingReport && existingReport.length > 0) continue;

    // Gather accomplishments
    const { data: completedLessons } = await supabase
      .from("lesson_progress")
      .select("id")
      .eq("user_id", client.id)
      .eq("completed", true)
      .gte("completed_at", startOfPrevMonth)
      .lte("completed_at", startOfMonth);

    const { data: quizAttempts } = await supabase
      .from("quiz_attempts")
      .select("id, score, passed")
      .eq("user_id", client.id)
      .gte("attempted_at", startOfPrevMonth)
      .lte("attempted_at", startOfMonth);

    const { data: roleplaySessions } = await supabase
      .from("roleplay_sessions")
      .select("id, score")
      .eq("user_id", client.id)
      .eq("status", "completed")
      .gte("started_at", startOfPrevMonth)
      .lte("started_at", startOfMonth);

    const { data: journals } = await supabase
      .from("daily_journals")
      .select("id")
      .eq("user_id", client.id)
      .gte("date", startOfPrevMonth.split("T")[0])
      .lte("date", startOfMonth.split("T")[0]);

    const lessonsCount = (completedLessons || []).length;
    const quizzesPassed = (quizAttempts || []).filter((q) => q.passed).length;
    const avgQuizScore =
      quizAttempts && quizAttempts.length > 0
        ? Math.round(
            quizAttempts.reduce((s, q) => s + q.score, 0) / quizAttempts.length,
          )
        : 0;
    const rpCount = (roleplaySessions || []).length;
    const avgRpScore =
      roleplaySessions && roleplaySessions.length > 0
        ? Math.round(
            roleplaySessions.reduce((s, r) => s + (r.score || 0), 0) /
              roleplaySessions.length,
          )
        : 0;
    const journalDays = (journals || []).length;

    // Skip if no activity at all
    if (lessonsCount + quizzesPassed + rpCount + journalDays === 0) continue;

    const monthName = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      1,
    ).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

    const bodyLines = [
      `Recap de ${monthName} :`,
      lessonsCount > 0 ? `- ${lessonsCount} lecon(s) completee(s)` : null,
      quizzesPassed > 0
        ? `- ${quizzesPassed} quiz reussi(s) (score moyen : ${avgQuizScore}%)`
        : null,
      rpCount > 0
        ? `- ${rpCount} session(s) de roleplay (score moyen : ${avgRpScore}/100)`
        : null,
      journalDays > 0 ? `- ${journalDays} jour(s) de journal rempli(s)` : null,
      "",
      "Continue sur cette lancee ce mois-ci !",
    ].filter(Boolean);

    await notify(client.id, `Ton bilan de ${monthName}`, bodyLines.join("\n"), {
      type: "monthly_value_report",
      link: "/dashboard",
    });

    sentCount++;
  }

  revalidatePath("/notifications");
  return { sent: sentCount };
}
