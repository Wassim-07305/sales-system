"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function submitNpsScore(surveyId: string, score: number, comment?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  await supabase
    .from("nps_surveys")
    .update({
      score,
      comment: comment || null,
      responded_at: new Date().toISOString(),
    })
    .eq("id", surveyId)
    .eq("client_id", user.id);

  // If score >= 8, trigger testimonial request
  if (score >= 8) {
    await supabase.from("notifications").insert({
      user_id: user.id,
      title: "Partagez votre expérience !",
      body: "Vous kiffez le Sales System ? Partagez un témoignage pour inspirer la communauté !",
      type: "testimonial_request",
      link: "/profile?tab=testimonial",
    });
  }

  revalidatePath("/");
}

export async function submitTestimonial(content: string, videoUrl?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  await supabase.from("testimonials").insert({
    client_id: user.id,
    content,
    video_url: videoUrl || null,
    status: "pending",
  });

  // Notify admins
  const { data: admins } = await supabase
    .from("profiles")
    .select("id")
    .in("role", ["admin", "manager"]);

  if (admins) {
    for (const admin of admins) {
      await supabase.from("notifications").insert({
        user_id: admin.id,
        title: "Nouveau témoignage",
        body: "Un client a soumis un nouveau témoignage à valider.",
        type: "testimonial",
        link: "/customers?tab=testimonials",
      });
    }
  }

  revalidatePath("/customers");
}

export async function updateTestimonialStatus(testimonialId: string, status: "approved" | "published" | "rejected") {
  const supabase = await createClient();
  await supabase
    .from("testimonials")
    .update({ status })
    .eq("id", testimonialId);
  revalidatePath("/customers");
}

// ---------- Auto-trigger NPS after deal signed ----------

export async function triggerPostClosingNps(dealId: string, clientId: string) {
  const supabase = await createClient();

  // Check if a post-closing survey already exists for this deal
  const { data: existing } = await supabase
    .from("nps_surveys")
    .select("id")
    .eq("client_id", clientId)
    .eq("trigger_day", -1) // -1 = post-closing trigger
    .single();

  if (existing) return; // Already sent

  await supabase.from("nps_surveys").insert({
    client_id: clientId,
    trigger_day: -1, // Special marker for post-closing
    sent_at: new Date().toISOString(),
  });

  await supabase.from("notifications").insert({
    user_id: clientId,
    title: "Comment s'est passé votre closing ?",
    body: "Votre deal vient d'être signé ! Donnez-nous votre avis en 30 secondes.",
    type: "nps",
    link: "/kpis",
  });
}

// ---------- NPS Analytics Dashboard ----------

export interface NpsAnalyticsResult {
  npsScore: number; // -100 to 100
  totalResponses: number;
  totalPending: number;
  promoters: number; // 9-10
  passives: number; // 7-8
  detractors: number; // 0-6
  avgScore: number;
  distribution: { score: number; count: number }[];
  trend: { month: string; nps: number; responses: number; avg: number }[];
  recentFeedback: {
    id: string;
    score: number;
    comment: string | null;
    triggerDay: number;
    respondedAt: string;
    clientName: string;
  }[];
  csatScore: number; // % satisfied (score >= 7)
}

export async function getNpsAnalytics(): Promise<NpsAnalyticsResult> {
  const supabase = await createClient();

  // All responded surveys
  const { data: surveys } = await supabase
    .from("nps_surveys")
    .select("id, client_id, score, comment, trigger_day, responded_at, sent_at, created_at")
    .order("responded_at", { ascending: false });

  const allSurveys = surveys || [];
  const responded = allSurveys.filter((s) => s.score !== null && s.responded_at);
  const pending = allSurveys.filter((s) => s.score === null);

  // Score distribution (0-10)
  const distribution = Array.from({ length: 11 }, (_, i) => ({
    score: i,
    count: responded.filter((s) => s.score === i).length,
  }));

  // NPS categories
  const promoters = responded.filter((s) => s.score !== null && s.score >= 9).length;
  const passives = responded.filter((s) => s.score !== null && s.score >= 7 && s.score <= 8).length;
  const detractors = responded.filter((s) => s.score !== null && s.score <= 6).length;
  const totalResponses = responded.length;

  const npsScore = totalResponses > 0
    ? Math.round(((promoters - detractors) / totalResponses) * 100)
    : 0;

  const avgScore = totalResponses > 0
    ? Math.round((responded.reduce((sum, s) => sum + (s.score || 0), 0) / totalResponses) * 10) / 10
    : 0;

  // CSAT: % of respondents with score >= 7
  const satisfied = responded.filter((s) => s.score !== null && s.score >= 7).length;
  const csatScore = totalResponses > 0 ? Math.round((satisfied / totalResponses) * 100) : 0;

  // Monthly trend (last 6 months)
  const now = new Date();
  const trend: NpsAnalyticsResult["trend"] = [];
  for (let i = 5; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
    const monthLabel = start.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });

    const monthSurveys = responded.filter((s) => {
      const d = new Date(s.responded_at!);
      return d >= start && d <= end;
    });

    const monthPromoters = monthSurveys.filter((s) => s.score! >= 9).length;
    const monthDetractors = monthSurveys.filter((s) => s.score! <= 6).length;
    const monthTotal = monthSurveys.length;
    const monthNps = monthTotal > 0 ? Math.round(((monthPromoters - monthDetractors) / monthTotal) * 100) : 0;
    const monthAvg = monthTotal > 0
      ? Math.round((monthSurveys.reduce((sum, s) => sum + (s.score || 0), 0) / monthTotal) * 10) / 10
      : 0;

    trend.push({ month: monthLabel, nps: monthNps, responses: monthTotal, avg: monthAvg });
  }

  // Get client names for recent feedback
  const clientIds = [...new Set(responded.slice(0, 10).map((s) => s.client_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", clientIds.length > 0 ? clientIds : ["none"]);

  const nameMap = new Map<string, string>();
  (profiles || []).forEach((p) => nameMap.set(p.id, p.full_name || "Client"));

  const recentFeedback = responded.slice(0, 10).map((s) => ({
    id: s.id,
    score: s.score!,
    comment: s.comment,
    triggerDay: s.trigger_day,
    respondedAt: s.responded_at!,
    clientName: nameMap.get(s.client_id) || "Client",
  }));

  return {
    npsScore,
    totalResponses,
    totalPending: pending.length,
    promoters,
    passives,
    detractors,
    avgScore,
    distribution,
    trend,
    recentFeedback,
    csatScore,
  };
}

export async function checkAndCreateNpsSurveys() {
  const supabase = await createClient();

  // Get all clients
  const { data: clients } = await supabase
    .from("profiles")
    .select("id, created_at")
    .in("role", ["client_b2b", "client_b2c"]);

  if (!clients) return;

  const triggerDays = [30, 60, 90];

  for (const client of clients) {
    const createdAt = new Date(client.created_at);
    const now = new Date();
    const daysSinceCreation = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

    for (const day of triggerDays) {
      if (daysSinceCreation >= day) {
        // Check if survey already exists for this trigger
        const { data: existing } = await supabase
          .from("nps_surveys")
          .select("id")
          .eq("client_id", client.id)
          .eq("trigger_day", day)
          .single();

        if (!existing) {
          await supabase.from("nps_surveys").insert({
            client_id: client.id,
            trigger_day: day,
            sent_at: new Date().toISOString(),
          });

          await supabase.from("notifications").insert({
            user_id: client.id,
            title: "Donnez votre avis !",
            body: `Ça fait ${day} jours que vous êtes avec nous. Comment évaluez-vous votre expérience ?`,
            type: "nps",
            link: "/kpis",
          });
        }
      }
    }
  }
}
