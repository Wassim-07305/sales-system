"use server";

import { createClient } from "@/lib/supabase/server";

interface ChurnRiskClient {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  health_score: number;
  last_booking: string | null;
  last_lesson_progress: string | null;
  days_inactive: number;
  risk_level: "high" | "critical";
}

interface ChurnAlert {
  client: ChurnRiskClient;
  actions: string[];
}

export async function detectChurnRisk(): Promise<ChurnRiskClient[]> {
  const supabase = await createClient();

  // Find clients with health_score < 30
  const { data: clients } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, health_score")
    .in("role", ["client_b2b", "client_b2c"])
    .lt("health_score", 30)
    .order("health_score", { ascending: true });

  if (!clients || clients.length === 0) return [];

  const thirtyDaysAgo = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000
  ).toISOString();

  const atRiskClients: ChurnRiskClient[] = [];

  for (const client of clients) {
    // Check last booking
    const { data: lastBooking } = await supabase
      .from("bookings")
      .select("date")
      .eq("client_id", client.id)
      .order("date", { ascending: false })
      .limit(1);

    // Check last lesson progress
    const { data: lastLesson } = await supabase
      .from("lesson_progress")
      .select("updated_at")
      .eq("user_id", client.id)
      .order("updated_at", { ascending: false })
      .limit(1);

    const lastBookingDate = lastBooking?.[0]?.date || null;
    const lastLessonDate = lastLesson?.[0]?.updated_at || null;

    // Determine the most recent activity date
    const activityDates = [lastBookingDate, lastLessonDate].filter(Boolean);
    const mostRecentActivity =
      activityDates.length > 0
        ? new Date(
            Math.max(...activityDates.map((d) => new Date(d!).getTime()))
          )
        : null;

    const daysInactive = mostRecentActivity
      ? Math.floor(
          (Date.now() - mostRecentActivity.getTime()) / (1000 * 60 * 60 * 24)
        )
      : 999;

    // Only include if no recent activity (30+ days)
    const noRecentBooking =
      !lastBookingDate || lastBookingDate < thirtyDaysAgo;
    const noRecentLessons =
      !lastLessonDate || lastLessonDate < thirtyDaysAgo;

    if (noRecentBooking && noRecentLessons) {
      atRiskClients.push({
        id: client.id,
        full_name: client.full_name,
        avatar_url: client.avatar_url,
        health_score: client.health_score || 0,
        last_booking: lastBookingDate,
        last_lesson_progress: lastLessonDate,
        days_inactive: daysInactive,
        risk_level: (client.health_score || 0) < 15 ? "critical" : "high",
      });
    }
  }

  return atRiskClients;
}

export async function getChurnAlerts(): Promise<ChurnAlert[]> {
  const atRiskClients = await detectChurnRisk();

  const alerts: ChurnAlert[] = atRiskClients.map((client) => {
    const actions: string[] = [];

    // Recommend actions based on the situation
    if (client.risk_level === "critical") {
      actions.push("Appeler le client immédiatement pour un check-in");
      actions.push("Proposer une session de coaching gratuite");
    }

    if (!client.last_booking || client.days_inactive > 30) {
      actions.push("Envoyer un message personnalisé de relance");
      actions.push("Proposer un RDV de suivi cette semaine");
    }

    if (!client.last_lesson_progress) {
      actions.push("Recommander un module de formation adapté");
      actions.push("Envoyer un rappel sur les formations disponibles");
    }

    if (client.days_inactive > 60) {
      actions.push("Offrir une promotion de réactivation");
      actions.push("Envoyer un questionnaire de satisfaction");
    }

    if (client.health_score < 10) {
      actions.push("Escalader au manager pour intervention personnelle");
    }

    return { client, actions };
  });

  // Sort by risk level (critical first) then by health score
  alerts.sort((a, b) => {
    if (a.client.risk_level === "critical" && b.client.risk_level !== "critical")
      return -1;
    if (a.client.risk_level !== "critical" && b.client.risk_level === "critical")
      return 1;
    return a.client.health_score - b.client.health_score;
  });

  return alerts;
}
