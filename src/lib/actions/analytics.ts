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

/**
 * Analyze prospect response data to find the best times to contact.
 * Returns a heatmap grid (day of week x hour) with response rates.
 */
export async function getBenchmarkData(period: "current" | "previous" | "quarter" = "current") {
  const supabase = await createClient();

  const now = new Date();

  // Calculate date ranges based on period
  let periodStart: Date;
  let periodEnd: Date;
  let prevPeriodStart: Date;
  let prevPeriodEnd: Date;

  if (period === "quarter") {
    const currentQuarter = Math.floor(now.getMonth() / 3);
    periodStart = new Date(now.getFullYear(), currentQuarter * 3, 1);
    periodEnd = new Date(now.getFullYear(), currentQuarter * 3 + 3, 0, 23, 59, 59);
    prevPeriodStart = new Date(now.getFullYear(), (currentQuarter - 1) * 3, 1);
    prevPeriodEnd = new Date(now.getFullYear(), currentQuarter * 3, 0, 23, 59, 59);
  } else if (period === "previous") {
    periodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    periodEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    prevPeriodStart = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    prevPeriodEnd = new Date(now.getFullYear(), now.getMonth() - 1, 0, 23, 59, 59);
  } else {
    periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    periodEnd = now;
    prevPeriodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    prevPeriodEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
  }

  // Get pipeline stages
  const { data: stages } = await supabase
    .from("pipeline_stages")
    .select("id, name")
    .order("position");

  const signedStage = stages?.find((s) => s.name === "Client Signé");

  // Get team members
  const { data: teamMembers } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .in("role", ["setter", "closer"]);

  // Get deals for current period
  const { data: currentDeals } = await supabase
    .from("deals")
    .select("id, value, stage_id, assigned_to, created_at")
    .gte("created_at", periodStart.toISOString())
    .lte("created_at", periodEnd.toISOString());

  // Get deals for previous period
  const { data: prevDeals } = await supabase
    .from("deals")
    .select("id, value, stage_id, assigned_to, created_at")
    .gte("created_at", prevPeriodStart.toISOString())
    .lte("created_at", prevPeriodEnd.toISOString());

  const deals = currentDeals || [];
  const previousDeals = prevDeals || [];

  // Per-member stats
  const members = (teamMembers || []).map((member) => {
    const memberDeals = deals.filter((d) => d.assigned_to === member.id);
    const closedDeals = memberDeals.filter((d) => d.stage_id === signedStage?.id);
    const revenue = closedDeals.reduce((sum, d) => sum + (d.value || 0), 0);
    const avgDealValue = closedDeals.length > 0 ? revenue / closedDeals.length : 0;
    const conversionRate = memberDeals.length > 0
      ? (closedDeals.length / memberDeals.length) * 100
      : 0;

    // Previous period stats for this member
    const prevMemberDeals = previousDeals.filter((d) => d.assigned_to === member.id);
    const prevClosedDeals = prevMemberDeals.filter((d) => d.stage_id === signedStage?.id);
    const prevRevenue = prevClosedDeals.reduce((sum, d) => sum + (d.value || 0), 0);

    return {
      id: member.id,
      name: member.full_name || "—",
      role: member.role as string,
      dealsCount: closedDeals.length,
      totalDeals: memberDeals.length,
      revenue,
      avgDealValue,
      conversionRate,
      prevRevenue,
      prevDealsCount: prevClosedDeals.length,
    };
  });

  // Team averages
  const activeMembers = members.filter((m) => m.totalDeals > 0 || m.dealsCount > 0);
  const memberCount = activeMembers.length || 1;
  const teamAvg = {
    dealsCount: members.reduce((s, m) => s + m.dealsCount, 0) / memberCount,
    revenue: members.reduce((s, m) => s + m.revenue, 0) / memberCount,
    avgDealValue: members.reduce((s, m) => s + m.avgDealValue, 0) / memberCount,
    conversionRate: members.reduce((s, m) => s + m.conversionRate, 0) / memberCount,
  };

  // Month vs previous month summary
  const totalRevenue = deals
    .filter((d) => d.stage_id === signedStage?.id)
    .reduce((s, d) => s + (d.value || 0), 0);
  const prevTotalRevenue = previousDeals
    .filter((d) => d.stage_id === signedStage?.id)
    .reduce((s, d) => s + (d.value || 0), 0);
  const totalClosedDeals = deals.filter((d) => d.stage_id === signedStage?.id).length;
  const prevTotalClosedDeals = previousDeals.filter((d) => d.stage_id === signedStage?.id).length;
  const avgValue = totalClosedDeals > 0 ? totalRevenue / totalClosedDeals : 0;
  const prevAvgValue = prevTotalClosedDeals > 0 ? prevTotalRevenue / prevTotalClosedDeals : 0;

  const revenueChange = prevTotalRevenue > 0
    ? ((totalRevenue - prevTotalRevenue) / prevTotalRevenue) * 100
    : 0;
  const dealsChange = prevTotalClosedDeals > 0
    ? ((totalClosedDeals - prevTotalClosedDeals) / prevTotalClosedDeals) * 100
    : 0;
  const avgValueChange = prevAvgValue > 0
    ? ((avgValue - prevAvgValue) / prevAvgValue) * 100
    : 0;

  return {
    members: members.sort((a, b) => b.revenue - a.revenue),
    teamAvg,
    summary: {
      totalRevenue,
      prevTotalRevenue,
      revenueChange,
      totalClosedDeals,
      prevTotalClosedDeals,
      dealsChange,
      avgValue,
      prevAvgValue,
      avgValueChange,
    },
  };
}

export async function getContactHeatmap() {
  const supabase = await createClient();

  // Get all prospect interactions with timestamps
  const { data: prospects } = await supabase
    .from("prospects")
    .select("contacted_at, status, last_reply_at")
    .not("contacted_at", "is", null);

  // Get bookings with scheduling times
  const { data: bookings } = await supabase
    .from("bookings")
    .select("scheduled_at, status, created_at");

  // Build heatmap: 7 days x 24 hours
  const heatmap: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
  const contactCount: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));

  // Analyze prospect contacts — count responses
  for (const p of prospects || []) {
    if (p.contacted_at) {
      const date = new Date(p.contacted_at);
      const day = date.getDay(); // 0=Sun, 6=Sat
      const hour = date.getHours();
      contactCount[day][hour]++;
      if (p.status === "replied" || p.status === "hot" || p.last_reply_at) {
        heatmap[day][hour]++;
      }
    }
  }

  // Analyze bookings — successful ones indicate good contact times
  for (const b of bookings || []) {
    if (b.created_at) {
      const date = new Date(b.created_at);
      const day = date.getDay();
      const hour = date.getHours();
      contactCount[day][hour]++;
      if (b.status === "completed") {
        heatmap[day][hour]++;
      }
    }
  }

  // Calculate response rates
  const dayLabels = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
  const grid: Array<{ day: string; dayIndex: number; hour: number; contacts: number; responses: number; rate: number }> = [];

  for (let d = 0; d < 7; d++) {
    for (let h = 6; h <= 21; h++) { // Only 6am-9pm
      const contacts = contactCount[d][h];
      const responses = heatmap[d][h];
      const rate = contacts > 0 ? Math.round((responses / contacts) * 100) : 0;
      grid.push({
        day: dayLabels[d],
        dayIndex: d,
        hour: h,
        contacts,
        responses,
        rate,
      });
    }
  }

  // Find best slots
  const bestSlots = [...grid]
    .filter((g) => g.contacts >= 2)
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 5);

  return { grid, bestSlots, dayLabels };
}
