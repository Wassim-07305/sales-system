"use server";

import { createClient } from "@/lib/supabase/server";

// ---------- Multi-Touch Attribution ----------

export interface TouchpointEvent {
  id: string;
  touchpoint_type: string;
  channel: string | null;
  created_at: string;
  metadata: Record<string, unknown>;
}

export interface DealAttribution {
  dealId: string;
  dealTitle: string;
  dealValue: number;
  prospectName: string;
  touchpoints: TouchpointEvent[];
}

export async function getMultiTouchAttribution(): Promise<DealAttribution[]> {
  const supabase = await createClient();

  const { data: events } = await supabase
    .from("attribution_events")
    .select("id, deal_id, prospect_id, touchpoint_type, channel, metadata, created_at")
    .order("created_at", { ascending: true });

  if (!events || events.length === 0) return [];

  // Group by deal_id
  const dealMap = new Map<string, TouchpointEvent[]>();
  const prospectIds = new Set<string>();
  const dealIds = new Set<string>();

  for (const event of events) {
    if (!event.deal_id) continue;
    dealIds.add(event.deal_id);
    if (event.prospect_id) prospectIds.add(event.prospect_id);

    const list = dealMap.get(event.deal_id) || [];
    list.push({
      id: event.id,
      touchpoint_type: event.touchpoint_type,
      channel: event.channel,
      created_at: event.created_at,
      metadata: event.metadata as Record<string, unknown>,
    });
    dealMap.set(event.deal_id, list);
  }

  // Fetch deal details
  const { data: deals } = await supabase
    .from("deals")
    .select("id, title, value, prospect_id")
    .in("id", Array.from(dealIds));

  // Fetch prospect names
  const allProspectIds = new Set<string>();
  (deals || []).forEach((d) => {
    if (d.prospect_id) allProspectIds.add(d.prospect_id);
  });
  prospectIds.forEach((pid) => allProspectIds.add(pid));

  const { data: prospects } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", Array.from(allProspectIds));

  const prospectNameMap = new Map<string, string>();
  (prospects || []).forEach((p) => {
    prospectNameMap.set(p.id, p.full_name || "Inconnu");
  });

  const dealDetailsMap = new Map<string, { title: string; value: number; prospectId: string | null }>();
  (deals || []).forEach((d) => {
    dealDetailsMap.set(d.id, { title: d.title || "Sans titre", value: d.value || 0, prospectId: d.prospect_id });
  });

  const result: DealAttribution[] = [];
  for (const [dealId, touchpoints] of dealMap.entries()) {
    const detail = dealDetailsMap.get(dealId);
    result.push({
      dealId,
      dealTitle: detail?.title || "Sans titre",
      dealValue: detail?.value || 0,
      prospectName: detail?.prospectId ? (prospectNameMap.get(detail.prospectId) || "Inconnu") : "Inconnu",
      touchpoints: touchpoints.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
    });
  }

  return result.sort((a, b) => b.dealValue - a.dealValue);
}

// ---------- Revenue Projections ----------

export interface MonthlyProjection {
  month: string;
  projected: number;
  cumulative: number;
}

export interface ProjectionResult {
  monthly: MonthlyProjection[];
  totalProjected: number;
  avgMonthly: number;
  growthRate: number;
  deals: { title: string; value: number; probability: number; projected: number }[];
}

export async function getRevenueProjections(
  scenario: "conservative" | "moderate" | "optimistic" = "moderate"
): Promise<ProjectionResult> {
  const supabase = await createClient();

  const { data: stages } = await supabase
    .from("pipeline_stages")
    .select("id, name, position")
    .order("position");

  const signedStage = stages?.find((s) => s.name === "Client Signé");
  const totalStages = (stages || []).length;

  const { data: allDeals } = await supabase
    .from("deals")
    .select("id, title, value, stage_id, created_at");

  const deals = (allDeals || []).filter((d) => d.stage_id !== signedStage?.id);

  // Multipliers per scenario
  const multiplier = { conservative: 0.7, moderate: 1.0, optimistic: 1.3 }[scenario];

  // Calculate probability per deal based on stage position
  const stagePositionMap = new Map<string, number>();
  (stages || []).forEach((s) => {
    stagePositionMap.set(s.id, s.position);
  });

  const dealProjections = deals.map((deal) => {
    const position = stagePositionMap.get(deal.stage_id) || 0;
    const baseProbability = totalStages > 1 ? (position / (totalStages - 1)) * 100 : 50;
    const probability = Math.min(baseProbability * multiplier, 100);
    const projected = (deal.value || 0) * (probability / 100);

    return {
      title: deal.title || "Sans titre",
      value: deal.value || 0,
      probability: Math.round(probability),
      projected: Math.round(projected),
    };
  });

  const totalProjected = dealProjections.reduce((sum, d) => sum + d.projected, 0);

  // Spread projections across 6 months (weighted towards earlier months for pipeline deals)
  const now = new Date();
  const monthly: MonthlyProjection[] = [];
  let cumulative = 0;

  // Weight distribution: heavier in months 2-3 for pipeline deals
  const weights = [0.10, 0.20, 0.25, 0.20, 0.15, 0.10];

  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i + 1, 1);
    const monthValue = Math.round(totalProjected * weights[i]);
    cumulative += monthValue;
    monthly.push({
      month: d.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" }),
      projected: monthValue,
      cumulative,
    });
  }

  // Growth rate: compare first half to second half
  const firstHalf = monthly.slice(0, 3).reduce((s, m) => s + m.projected, 0);
  const secondHalf = monthly.slice(3).reduce((s, m) => s + m.projected, 0);
  const growthRate = firstHalf > 0 ? ((secondHalf - firstHalf) / firstHalf) * 100 : 0;

  return {
    monthly,
    totalProjected,
    avgMonthly: Math.round(totalProjected / 6),
    growthRate: Math.round(growthRate),
    deals: dealProjections.sort((a, b) => b.projected - a.projected),
  };
}

// ---------- Setter Reports ----------

export interface SetterMetrics {
  setterId: string;
  setterName: string;
  dmsSent: number;
  responses: number;
  responseRate: number;
  bookings: number;
  showUpRate: number;
  closingContribution: number;
  currentWeek: {
    dmsSent: number;
    responses: number;
    bookings: number;
    showUpRate: number;
  };
  previousWeek: {
    dmsSent: number;
    responses: number;
    bookings: number;
    showUpRate: number;
  };
}

export async function generateSetterReport(setterId?: string): Promise<SetterMetrics[]> {
  const supabase = await createClient();

  // Get setters
  const query = supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("role", "setter");

  if (setterId && setterId !== "all") {
    query.eq("id", setterId);
  }

  const { data: setters } = await query;

  if (!setters || setters.length === 0) return [];

  const now = new Date();
  const startOfCurrentWeek = new Date(now);
  startOfCurrentWeek.setDate(now.getDate() - now.getDay() + 1); // Monday
  startOfCurrentWeek.setHours(0, 0, 0, 0);

  const startOfPrevWeek = new Date(startOfCurrentWeek);
  startOfPrevWeek.setDate(startOfPrevWeek.getDate() - 7);

  const { data: stages } = await supabase.from("pipeline_stages").select("id, name");
  const signedStage = stages?.find((s) => s.name === "Client Signé");

  // Get all bookings
  const { data: allBookings } = await supabase
    .from("bookings")
    .select("id, assigned_to, status, scheduled_at, created_at")
    .in("assigned_to", setters.map((s) => s.id));

  // Get deals for closing contribution
  const { data: allDeals } = await supabase
    .from("deals")
    .select("id, assigned_to, stage_id, value");

  // Get setter weekly reports if they exist
  const { data: weeklyReports } = await supabase
    .from("setter_weekly_reports")
    .select("*")
    .in("setter_id", setters.map((s) => s.id))
    .gte("week_start", startOfPrevWeek.toISOString())
    .order("week_start", { ascending: false });

  const results: SetterMetrics[] = setters.map((setter) => {
    const bookings = (allBookings || []).filter((b) => b.assigned_to === setter.id);
    const deals = (allDeals || []).filter((d) => d.assigned_to === setter.id);

    // Current week bookings
    const currentWeekBookings = bookings.filter(
      (b) => new Date(b.scheduled_at || b.created_at) >= startOfCurrentWeek
    );
    const prevWeekBookings = bookings.filter(
      (b) => {
        const date = new Date(b.scheduled_at || b.created_at);
        return date >= startOfPrevWeek && date < startOfCurrentWeek;
      }
    );

    // Use weekly reports for DM metrics if available, otherwise estimate from bookings
    const currentReport = (weeklyReports || []).find(
      (r) => r.setter_id === setter.id && new Date(r.week_start) >= startOfCurrentWeek
    );
    const prevReport = (weeklyReports || []).find(
      (r) => r.setter_id === setter.id && new Date(r.week_start) >= startOfPrevWeek && new Date(r.week_start) < startOfCurrentWeek
    );

    const currentDMs = (currentReport?.metrics as Record<string, number>)?.dms_sent || currentWeekBookings.length * 15;
    const currentResponses = (currentReport?.metrics as Record<string, number>)?.responses || currentWeekBookings.length * 5;
    const prevDMs = (prevReport?.metrics as Record<string, number>)?.dms_sent || prevWeekBookings.length * 15;
    const prevResponses = (prevReport?.metrics as Record<string, number>)?.responses || prevWeekBookings.length * 5;

    const totalDMs = currentDMs + prevDMs + (bookings.length * 10);
    const totalResponses = currentResponses + prevResponses + (bookings.length * 3);
    const completedBookings = bookings.filter((b) => b.status === "completed");
    const showUpRate = bookings.length > 0 ? (completedBookings.length / bookings.length) * 100 : 0;

    const signedDeals = deals.filter((d) => d.stage_id === signedStage?.id);
    const closingContribution = signedDeals.reduce((sum, d) => sum + (d.value || 0), 0);

    const currentShowUp = currentWeekBookings.length > 0
      ? (currentWeekBookings.filter((b) => b.status === "completed").length / currentWeekBookings.length) * 100
      : 0;
    const prevShowUp = prevWeekBookings.length > 0
      ? (prevWeekBookings.filter((b) => b.status === "completed").length / prevWeekBookings.length) * 100
      : 0;

    return {
      setterId: setter.id,
      setterName: setter.full_name || "Setter",
      dmsSent: totalDMs,
      responses: totalResponses,
      responseRate: totalDMs > 0 ? (totalResponses / totalDMs) * 100 : 0,
      bookings: bookings.length,
      showUpRate,
      closingContribution,
      currentWeek: {
        dmsSent: currentDMs,
        responses: currentResponses,
        bookings: currentWeekBookings.length,
        showUpRate: currentShowUp,
      },
      previousWeek: {
        dmsSent: prevDMs,
        responses: prevResponses,
        bookings: prevWeekBookings.length,
        showUpRate: prevShowUp,
      },
    };
  });

  return results;
}

// ---------- Content Heatmap ----------

export interface HeatmapCell {
  day: number; // 0-6 (Mon-Sun)
  hour: number; // 0-23
  value: number;
}

export interface HeatmapResult {
  grid: HeatmapCell[];
  bestDay: number;
  bestHour: number;
  totalEngagement: number;
  maxValue: number;
}

export async function getContentHeatmap(): Promise<HeatmapResult> {
  const supabase = await createClient();

  // Try content_posts first, fall back to attribution_events for engagement data
  const { data: events } = await supabase
    .from("attribution_events")
    .select("id, touchpoint_type, channel, created_at, metadata")
    .order("created_at", { ascending: true });

  // Initialize grid: 7 days x 24 hours
  const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));

  if (events && events.length > 0) {
    for (const event of events) {
      const date = new Date(event.created_at);
      // getDay() returns 0=Sun,1=Mon... We want 0=Mon,1=Tue...
      const day = (date.getDay() + 6) % 7;
      const hour = date.getHours();
      const engagementValue = (event.metadata as Record<string, number>)?.engagement || 1;
      grid[day][hour] += engagementValue;
    }
  }

  // Build flat array
  const cells: HeatmapCell[] = [];
  let maxValue = 0;
  const dayTotals = Array(7).fill(0);
  const hourTotals = Array(24).fill(0);
  let totalEngagement = 0;

  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      const value = grid[day][hour];
      cells.push({ day, hour, value });
      if (value > maxValue) maxValue = value;
      dayTotals[day] += value;
      hourTotals[hour] += value;
      totalEngagement += value;
    }
  }

  const bestDay = dayTotals.indexOf(Math.max(...dayTotals));
  const bestHour = hourTotals.indexOf(Math.max(...hourTotals));

  return { grid: cells, bestDay, bestHour, totalEngagement, maxValue };
}

// ---------- Value Report ----------

export interface ClientValueMetric {
  clientId: string;
  clientName: string;
  revenue: number;
  healthScore: number;
}

export interface ValueReportResult {
  revenuePerClient: number;
  estimatedCPA: number;
  estimatedLTV: number;
  avgSatisfaction: number;
  totalRevenue: number;
  totalClients: number;
  clients: ClientValueMetric[];
  healthDistribution: { range: string; count: number }[];
}

export async function generateValueReport(): Promise<ValueReportResult> {
  const supabase = await createClient();

  const { data: stages } = await supabase.from("pipeline_stages").select("id, name");
  const signedStage = stages?.find((s) => s.name === "Client Signé");

  // Get clients with health scores
  const { data: clients } = await supabase
    .from("profiles")
    .select("id, full_name, health_score, role")
    .in("role", ["client_b2b", "client_b2c"]);

  // Get signed deals
  const { data: deals } = await supabase
    .from("deals")
    .select("id, prospect_id, value, stage_id")
    .eq("stage_id", signedStage?.id || "");

  // Calculate per-client revenue
  const clientRevenueMap = new Map<string, number>();
  (deals || []).forEach((deal) => {
    if (deal.prospect_id) {
      const current = clientRevenueMap.get(deal.prospect_id) || 0;
      clientRevenueMap.set(deal.prospect_id, current + (deal.value || 0));
    }
  });

  const totalRevenue = (deals || []).reduce((sum, d) => sum + (d.value || 0), 0);
  const totalClients = (clients || []).length;
  const revenuePerClient = totalClients > 0 ? Math.round(totalRevenue / totalClients) : 0;

  // Estimated CPA (mock: based on assumed marketing spend ratio)
  const estimatedCPA = totalClients > 0 ? Math.round((totalRevenue * 0.15) / totalClients) : 0;

  // Estimated LTV (average revenue * estimated retention of 18 months / avg deal cycle ~3 months)
  const estimatedLTV = Math.round(revenuePerClient * 6);

  // Average satisfaction from health scores
  const healthScores = (clients || []).map((c) => c.health_score || 50);
  const avgSatisfaction = healthScores.length > 0
    ? Math.round(healthScores.reduce((s, h) => s + h, 0) / healthScores.length)
    : 0;

  // Per-client metrics
  const clientMetrics: ClientValueMetric[] = (clients || []).map((client) => ({
    clientId: client.id,
    clientName: client.full_name || "Client",
    revenue: clientRevenueMap.get(client.id) || 0,
    healthScore: client.health_score || 50,
  })).sort((a, b) => b.revenue - a.revenue);

  // Health score distribution
  const ranges = [
    { range: "0-20", min: 0, max: 20 },
    { range: "21-40", min: 21, max: 40 },
    { range: "41-60", min: 41, max: 60 },
    { range: "61-80", min: 61, max: 80 },
    { range: "81-100", min: 81, max: 100 },
  ];

  const healthDistribution = ranges.map(({ range, min, max }) => ({
    range,
    count: healthScores.filter((h) => h >= min && h <= max).length,
  }));

  return {
    revenuePerClient,
    estimatedCPA,
    estimatedLTV,
    avgSatisfaction,
    totalRevenue,
    totalClients,
    clients: clientMetrics,
    healthDistribution,
  };
}
