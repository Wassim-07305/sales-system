"use server";

import { createClient } from "@/lib/supabase/server";

export async function getAnalyticsData() {
  const supabase = await createClient();

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();

  // Get pipeline stages
  const { data: stages } = await supabase
    .from("pipeline_stages")
    .select("id, name, position")
    .order("position");

  const signedStage = stages?.find((s) => s.name === "Client Signé");

  // Get all deals
  const { data: allDeals } = await supabase
    .from("deals")
    .select("id, value, source, stage_id, assigned_to, created_at");

  const deals = allDeals || [];

  // CA this month (signed deals this month)
  const signedDealsThisMonth = deals.filter(
    (d) => d.stage_id === signedStage?.id && d.created_at >= startOfMonth
  );
  const caThisMonth = signedDealsThisMonth.reduce((sum, d) => sum + (d.value || 0), 0);

  // CA previous month
  const signedDealsPrevMonth = deals.filter(
    (d) => d.stage_id === signedStage?.id && d.created_at >= startOfPrevMonth && d.created_at <= endOfPrevMonth
  );
  const caPrevMonth = signedDealsPrevMonth.reduce((sum, d) => sum + (d.value || 0), 0);

  // Active clients (health_score > 40)
  const { count: activeClients } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .in("role", ["client_b2b", "client_b2c"])
    .gt("health_score", 40);

  const { count: totalClients } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .in("role", ["client_b2b", "client_b2c"]);

  // Pipeline value (non-signed deals)
  const pipelineDeals = deals.filter((d) => d.stage_id !== signedStage?.id);
  const pipelineValue = pipelineDeals.reduce((sum, d) => sum + (d.value || 0), 0);

  // Conversion rate this month
  const dealsThisMonth = deals.filter((d) => d.created_at >= startOfMonth);
  const conversionRate = dealsThisMonth.length > 0
    ? (signedDealsThisMonth.length / dealsThisMonth.length) * 100
    : 0;

  // Churn rate
  const { count: churnedClients } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .in("role", ["client_b2b", "client_b2c"])
    .lt("health_score", 30);

  const churnRate = (totalClients || 0) > 0
    ? ((churnedClients || 0) / (totalClients || 0)) * 100
    : 0;

  // Revenue last 6 months
  const revenueByMonth: { month: string; value: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
    const monthDeals = deals.filter(
      (deal) => deal.stage_id === signedStage?.id && deal.created_at >= d.toISOString() && deal.created_at <= end.toISOString()
    );
    revenueByMonth.push({
      month: d.toLocaleDateString("fr-FR", { month: "short" }),
      value: monthDeals.reduce((sum, deal) => sum + (deal.value || 0), 0),
    });
  }

  // Deals closed by month
  const dealsByMonth: { month: string; count: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
    const count = deals.filter(
      (deal) => deal.stage_id === signedStage?.id && deal.created_at >= d.toISOString() && deal.created_at <= end.toISOString()
    ).length;
    dealsByMonth.push({
      month: d.toLocaleDateString("fr-FR", { month: "short" }),
      count,
    });
  }

  // Change vs previous month
  const caChange = caPrevMonth > 0 ? ((caThisMonth - caPrevMonth) / caPrevMonth) * 100 : 0;

  return {
    caThisMonth,
    caChange,
    activeClients: activeClients || 0,
    totalClients: totalClients || 0,
    pipelineValue,
    conversionRate,
    churnRate,
    revenueByMonth,
    dealsByMonth,
  };
}

export async function getFunnelData() {
  const supabase = await createClient();

  const { data: stages } = await supabase
    .from("pipeline_stages")
    .select("id, name, position, color")
    .order("position");

  const { data: deals } = await supabase.from("deals").select("stage_id");

  const funnelData = (stages || []).map((stage) => {
    const count = (deals || []).filter((d) => d.stage_id === stage.id).length;
    return { stage: stage.name, value: count, color: stage.color, position: stage.position };
  });

  return funnelData;
}

export async function getSourceData() {
  const supabase = await createClient();

  const { data: stages } = await supabase.from("pipeline_stages").select("id, name");
  const signedStage = stages?.find((s) => s.name === "Client Signé");

  const { data: deals } = await supabase.from("deals").select("id, value, source, stage_id");

  const sourceMap = new Map<string, { total: number; value: number; signed: number; signedValue: number }>();
  (deals || []).forEach((d) => {
    const src = d.source || "Autre";
    const entry = sourceMap.get(src) || { total: 0, value: 0, signed: 0, signedValue: 0 };
    entry.total++;
    entry.value += d.value || 0;
    if (d.stage_id === signedStage?.id) {
      entry.signed++;
      entry.signedValue += d.value || 0;
    }
    sourceMap.set(src, entry);
  });

  const sourceColors: Record<string, string> = {
    LinkedIn: "#0077b5",
    Instagram: "#e4405f",
    Referral: "#7af17a",
    Contenu: "#f59e0b",
    Autre: "#6b7280",
  };

  const sourceData = Array.from(sourceMap.entries())
    .map(([name, data]) => ({
      name,
      deals: data.total,
      totalValue: data.value,
      signed: data.signed,
      signedValue: data.signedValue,
      conversionRate: data.total > 0 ? (data.signed / data.total) * 100 : 0,
      color: sourceColors[name] || "#6b7280",
    }))
    .sort((a, b) => b.signedValue - a.signedValue);

  return sourceData;
}

export async function getTeamPerformance() {
  const supabase = await createClient();

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const { data: stages } = await supabase.from("pipeline_stages").select("id, name");
  const signedStage = stages?.find((s) => s.name === "Client Signé");

  // Get team members (setters + closers)
  const { data: teamMembers } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .in("role", ["setter", "closer"]);

  // Get bookings this month
  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, assigned_to, status, scheduled_at")
    .gte("scheduled_at", startOfMonth);

  // Get deals
  const { data: deals } = await supabase
    .from("deals")
    .select("id, assigned_to, stage_id, value, created_at")
    .gte("created_at", startOfMonth);

  const performance = (teamMembers || []).map((member) => {
    const memberBookings = (bookings || []).filter((b) => b.assigned_to === member.id);
    const completedBookings = memberBookings.filter((b) => b.status === "completed");
    const noShowBookings = memberBookings.filter((b) => b.status === "no_show");
    const showUpRate = memberBookings.length > 0
      ? (completedBookings.length / memberBookings.length) * 100
      : 0;

    const memberDeals = (deals || []).filter((d) => d.assigned_to === member.id);
    const closedDeals = memberDeals.filter((d) => d.stage_id === signedStage?.id);
    const closingRate = memberDeals.length > 0
      ? (closedDeals.length / memberDeals.length) * 100
      : 0;
    const revenue = closedDeals.reduce((sum, d) => sum + (d.value || 0), 0);

    return {
      id: member.id,
      name: member.full_name || "—",
      role: member.role,
      bookingsCount: memberBookings.length,
      showUpRate,
      closingRate,
      revenue,
    };
  });

  return performance;
}

export async function generateWeeklySummary() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile || profile.role !== "admin") return;

  const performance = await getTeamPerformance();
  const analytics = await getAnalyticsData();

  const summary = `Résumé hebdo : CA ${analytics.caThisMonth.toLocaleString("fr-FR")}€ | ${analytics.activeClients} clients actifs | Pipeline ${analytics.pipelineValue.toLocaleString("fr-FR")}€`;

  await supabase.from("notifications").insert({
    user_id: user.id,
    title: "📊 Résumé hebdomadaire",
    body: summary,
    type: "deal",
    link: "/analytics",
  });
}
