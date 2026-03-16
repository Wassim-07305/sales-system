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
    .select(
      "id, deal_id, prospect_id, touchpoint_type, channel, metadata, created_at",
    )
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

  const dealDetailsMap = new Map<
    string,
    { title: string; value: number; prospectId: string | null }
  >();
  (deals || []).forEach((d) => {
    dealDetailsMap.set(d.id, {
      title: d.title || "Sans titre",
      value: d.value || 0,
      prospectId: d.prospect_id,
    });
  });

  const result: DealAttribution[] = [];
  for (const [dealId, touchpoints] of dealMap.entries()) {
    const detail = dealDetailsMap.get(dealId);
    result.push({
      dealId,
      dealTitle: detail?.title || "Sans titre",
      dealValue: detail?.value || 0,
      prospectName: detail?.prospectId
        ? prospectNameMap.get(detail.prospectId) || "Inconnu"
        : "Inconnu",
      touchpoints: touchpoints.sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      ),
    });
  }

  return result.sort((a, b) => b.dealValue - a.dealValue);
}

// ---------- Revenue Projections (F20) ----------

export interface RevenueProjectionMonth {
  month: string;
  actual: number | null;
  projected: number | null;
  trend: number | null;
  optimistic: number | null;
  pessimistic: number | null;
}

export interface RevenueProjectionResult {
  chartData: RevenueProjectionMonth[];
  projectedNextMonth: number;
  projectedNextQuarter: number;
  pipelineWeightedValue: number;
  trendSlope: number;
  trendIntercept: number;
  historicalMonths: { month: string; value: number }[];
  projectedMonths: { month: string; value: number }[];
  pipelineDeals: {
    title: string;
    value: number;
    probability: number;
    weighted: number;
  }[];
}

// ---------- AI Forecasting (F28.4) ----------

export interface AIForecastDealInsight {
  dealTitle: string;
  dealValue: number;
  churnRisk: "low" | "medium" | "high";
  churnRiskScore: number;
  nextBestAction: string;
  isAnomaly: boolean;
  anomalyReason: string | null;
}

export interface AIForecastResult {
  dealInsights: AIForecastDealInsight[];
  globalInsights: {
    summary: string;
    topRisks: string[];
    opportunities: string[];
    recommendedActions: string[];
  };
  whatIfScenarios: {
    conversionUp10: number;
    conversionUp20: number;
    conversionDown10: number;
    avgDealValueUp15: number;
  };
}

export async function getRevenueProjections(): Promise<RevenueProjectionResult> {
  const supabase = await createClient();

  // Get pipeline stages to identify signed deals
  const { data: stages } = await supabase
    .from("pipeline_stages")
    .select("id, name, position")
    .order("position");

  const signedStage = stages?.find((s) => s.name === "Client Signé");
  const totalStages = (stages || []).length;

  // Fetch all deals
  const { data: allDeals } = await supabase
    .from("deals")
    .select("id, title, value, stage_id, created_at");

  const deals = allDeals || [];

  // ---- Historical: last 6 months of closed (signed) deals ----
  const now = new Date();
  const historicalMonths: { month: string; label: string; value: number }[] =
    [];

  for (let i = 5; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(
      now.getFullYear(),
      now.getMonth() - i + 1,
      0,
      23,
      59,
      59,
    );
    const monthDeals = deals.filter(
      (d) =>
        d.stage_id === signedStage?.id &&
        d.created_at >= start.toISOString() &&
        d.created_at <= end.toISOString(),
    );
    const value = monthDeals.reduce((sum, d) => sum + (d.value || 0), 0);
    historicalMonths.push({
      month: start.toLocaleDateString("fr-FR", {
        month: "short",
        year: "2-digit",
      }),
      label: start.toLocaleDateString("fr-FR", {
        month: "long",
        year: "numeric",
      }),
      value,
    });
  }

  // ---- Simple linear regression on historical data ----
  // x = 0..5 (month index), y = revenue
  const n = historicalMonths.length;
  let sumX = 0,
    sumY = 0,
    sumXY = 0,
    sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += historicalMonths[i].value;
    sumXY += i * historicalMonths[i].value;
    sumX2 += i * i;
  }

  const denom = n * sumX2 - sumX * sumX;
  const slope = denom !== 0 ? (n * sumXY - sumX * sumY) / denom : 0;
  const intercept = denom !== 0 ? (sumY - slope * sumX) / n : sumY / n;

  // ---- Standard error for confidence intervals ----
  let ssRes = 0;
  for (let i = 0; i < n; i++) {
    const predicted = intercept + slope * i;
    ssRes += (historicalMonths[i].value - predicted) ** 2;
  }
  const stdError = n > 2 ? Math.sqrt(ssRes / (n - 2)) : 0;
  // ~90% confidence multiplier
  const confidenceMultiplier = 1.645;

  // ---- Project next 3 months ----
  const projectedMonths: { month: string; label: string; value: number }[] = [];
  for (let i = 1; i <= 3; i++) {
    const futureDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const projectedValue = Math.max(
      0,
      Math.round(intercept + slope * (n - 1 + i)),
    );
    projectedMonths.push({
      month: futureDate.toLocaleDateString("fr-FR", {
        month: "short",
        year: "2-digit",
      }),
      label: futureDate.toLocaleDateString("fr-FR", {
        month: "long",
        year: "numeric",
      }),
      value: projectedValue,
    });
  }

  // ---- Pipeline-weighted projection: open deals * probability ----
  const stagePositionMap = new Map<string, number>();
  (stages || []).forEach((s) => {
    stagePositionMap.set(s.id, s.position);
  });

  const openDeals = deals.filter((d) => d.stage_id !== signedStage?.id);
  const pipelineDeals = openDeals
    .map((deal) => {
      const position = stagePositionMap.get(deal.stage_id) || 0;
      const probability =
        totalStages > 1 ? Math.round((position / (totalStages - 1)) * 100) : 50;
      const weighted = Math.round((deal.value || 0) * (probability / 100));
      return {
        title: deal.title || "Sans titre",
        value: deal.value || 0,
        probability,
        weighted,
      };
    })
    .sort((a, b) => b.weighted - a.weighted);

  const pipelineWeightedValue = pipelineDeals.reduce(
    (sum, d) => sum + d.weighted,
    0,
  );

  // ---- Build unified chart data ----
  const chartData: RevenueProjectionMonth[] = [];

  // Historical months: actual + trend line
  for (let i = 0; i < n; i++) {
    chartData.push({
      month: historicalMonths[i].month,
      actual: historicalMonths[i].value,
      projected: null,
      trend: Math.max(0, Math.round(intercept + slope * i)),
      optimistic: null,
      pessimistic: null,
    });
  }

  // Last historical month also gets a projected value to connect the lines
  if (chartData.length > 0) {
    const last = chartData[chartData.length - 1];
    last.projected = last.actual;
    last.optimistic = last.actual;
    last.pessimistic = last.actual;
  }

  // Projected months with confidence intervals
  for (let i = 0; i < projectedMonths.length; i++) {
    const futureIdx = n + i;
    const margin =
      confidenceMultiplier *
      stdError *
      Math.sqrt(
        1 + 1 / n + (futureIdx - sumX / n) ** 2 / (sumX2 - sumX ** 2 / n || 1),
      );
    chartData.push({
      month: projectedMonths[i].month,
      actual: null,
      projected: projectedMonths[i].value,
      trend: Math.max(0, Math.round(intercept + slope * futureIdx)),
      optimistic: Math.max(0, Math.round(projectedMonths[i].value + margin)),
      pessimistic: Math.max(0, Math.round(projectedMonths[i].value - margin)),
    });
  }

  const projectedNextMonth = projectedMonths[0]?.value || 0;
  const projectedNextQuarter = projectedMonths.reduce(
    (sum, m) => sum + m.value,
    0,
  );

  return {
    chartData,
    projectedNextMonth,
    projectedNextQuarter,
    pipelineWeightedValue,
    trendSlope: Math.round(slope),
    trendIntercept: Math.round(intercept),
    historicalMonths: historicalMonths.map((m) => ({
      month: m.label,
      value: m.value,
    })),
    projectedMonths: projectedMonths.map((m) => ({
      month: m.label,
      value: m.value,
    })),
    pipelineDeals,
  };
}

// ---------- AI Forecasting Server Action (F28.4) ----------

export async function getAIForecasting(): Promise<AIForecastResult> {
  const supabase = await createClient();

  const { data: stages } = await supabase
    .from("pipeline_stages")
    .select("id, name, position")
    .order("position");

  const signedStage = stages?.find((s) => s.name === "Client Signé");
  const totalStages = (stages || []).length;

  const { data: allDeals } = await supabase
    .from("deals")
    .select(
      "id, title, value, stage_id, created_at, updated_at, assigned_to, contact_id",
    );

  const deals = allDeals || [];
  const openDeals = deals.filter((d) => d.stage_id !== signedStage?.id);
  const signedDeals = deals.filter((d) => d.stage_id === signedStage?.id);

  // Stage position map for probability
  const stagePositionMap = new Map<string, number>();
  const stageNameMap = new Map<string, string>();
  (stages || []).forEach((s) => {
    stagePositionMap.set(s.id, s.position);
    stageNameMap.set(s.id, s.name);
  });

  // Calculate stats for anomaly detection
  const dealValues = deals.map((d) => d.value || 0).filter((v) => v > 0);
  const avgDealValue =
    dealValues.length > 0
      ? dealValues.reduce((a, b) => a + b, 0) / dealValues.length
      : 0;
  const stdDev =
    dealValues.length > 1
      ? Math.sqrt(
          dealValues.reduce((sum, v) => sum + (v - avgDealValue) ** 2, 0) /
            (dealValues.length - 1),
        )
      : 0;

  // Total pipeline value & conversion rate for what-if
  const totalPipelineValue = openDeals.reduce(
    (sum, d) => sum + (d.value || 0),
    0,
  );
  const currentConversionRate =
    deals.length > 0 ? signedDeals.length / deals.length : 0;
  const avgWeightedPipeline = openDeals.reduce((sum, d) => {
    const pos = stagePositionMap.get(d.stage_id) || 0;
    const prob = totalStages > 1 ? pos / (totalStages - 1) : 0.5;
    return sum + (d.value || 0) * prob;
  }, 0);

  // Build deal summaries for AI prompt
  const dealSummaries = openDeals.slice(0, 20).map((d) => {
    const pos = stagePositionMap.get(d.stage_id) || 0;
    const stageName = stageNameMap.get(d.stage_id) || "Inconnu";
    const daysSinceCreation = Math.round(
      (Date.now() - new Date(d.created_at).getTime()) / (1000 * 60 * 60 * 24),
    );
    const daysSinceUpdate = Math.round(
      (Date.now() - new Date(d.updated_at).getTime()) / (1000 * 60 * 60 * 24),
    );
    const isValueAnomaly =
      stdDev > 0 && Math.abs((d.value || 0) - avgDealValue) > 2 * stdDev;
    return {
      title: d.title || "Sans titre",
      value: d.value || 0,
      stage: stageName,
      stagePosition: pos,
      totalStages,
      daysSinceCreation,
      daysSinceUpdate,
      isValueAnomaly,
    };
  });

  // Try AI analysis — fallback to heuristic if AI unavailable
  let dealInsights: AIForecastDealInsight[];
  let globalInsights: AIForecastResult["globalInsights"];

  try {
    const { aiJSON } = await import("@/lib/ai/client");

    const aiResult = await aiJSON<{
      deals: {
        title: string;
        churnRisk: "low" | "medium" | "high";
        churnRiskScore: number;
        nextBestAction: string;
        isAnomaly: boolean;
        anomalyReason: string | null;
      }[];
      summary: string;
      topRisks: string[];
      opportunities: string[];
      recommendedActions: string[];
    }>(
      `Analyse ces deals CRM et fournis des insights stratégiques.

Deals en cours:
${JSON.stringify(dealSummaries, null, 2)}

Stats globales:
- Valeur moyenne deal: ${Math.round(avgDealValue)} €
- Écart-type: ${Math.round(stdDev)} €
- Taux de conversion global: ${Math.round(currentConversionRate * 100)}%
- Deals signés: ${signedDeals.length}
- Deals en cours: ${openDeals.length}

Pour chaque deal, évalue:
1. churnRisk (low/medium/high) + churnRiskScore (0-100): risque de perdre ce deal
2. nextBestAction: action concrète recommandée (en français, max 80 caractères)
3. isAnomaly + anomalyReason: si le deal est atypique (valeur, durée, stagnation)

Pour les insights globaux, fournis:
- summary: résumé en 1-2 phrases de l'état du pipeline
- topRisks: 2-3 risques principaux
- opportunities: 2-3 opportunités identifiées
- recommendedActions: 3-4 actions prioritaires

Réponds en JSON avec la structure: { deals: [...], summary, topRisks, opportunities, recommendedActions }`,
      {
        system:
          "Tu es un expert en analyse commerciale B2B. Analyse les données CRM et fournis des recommandations actionnables.",
        model: "anthropic/claude-3.5-haiku",
        maxTokens: 2048,
      },
    );

    dealInsights = dealSummaries.map((ds, i) => {
      const aiDeal = aiResult.deals?.[i];
      return {
        dealTitle: ds.title,
        dealValue: ds.value,
        churnRisk:
          aiDeal?.churnRisk ||
          (ds.daysSinceUpdate > 14
            ? "high"
            : ds.daysSinceUpdate > 7
              ? "medium"
              : "low"),
        churnRiskScore:
          aiDeal?.churnRiskScore ||
          (ds.daysSinceUpdate > 14 ? 80 : ds.daysSinceUpdate > 7 ? 50 : 20),
        nextBestAction: aiDeal?.nextBestAction || "Planifier un suivi",
        isAnomaly: aiDeal?.isAnomaly ?? ds.isValueAnomaly,
        anomalyReason:
          aiDeal?.anomalyReason ||
          (ds.isValueAnomaly ? "Valeur atypique" : null),
      };
    });

    globalInsights = {
      summary: aiResult.summary || "Analyse du pipeline en cours.",
      topRisks: aiResult.topRisks || [],
      opportunities: aiResult.opportunities || [],
      recommendedActions: aiResult.recommendedActions || [],
    };
  } catch {
    // Fallback: heuristic-based analysis
    dealInsights = dealSummaries.map((ds) => ({
      dealTitle: ds.title,
      dealValue: ds.value,
      churnRisk: (ds.daysSinceUpdate > 14
        ? "high"
        : ds.daysSinceUpdate > 7
          ? "medium"
          : "low") as "low" | "medium" | "high",
      churnRiskScore:
        ds.daysSinceUpdate > 14 ? 80 : ds.daysSinceUpdate > 7 ? 50 : 20,
      nextBestAction:
        ds.daysSinceUpdate > 7 ? "Relancer le prospect" : "Continuer le suivi",
      isAnomaly: ds.isValueAnomaly,
      anomalyReason: ds.isValueAnomaly
        ? "Valeur significativement différente de la moyenne"
        : null,
    }));

    globalInsights = {
      summary: `${openDeals.length} deals en cours pour une valeur totale de ${totalPipelineValue.toLocaleString("fr-FR")} €.`,
      topRisks:
        openDeals.filter((d) => {
          const days = Math.round(
            (Date.now() - new Date(d.updated_at).getTime()) / 86400000,
          );
          return days > 14;
        }).length > 0
          ? [
              `${openDeals.filter((d) => Math.round((Date.now() - new Date(d.updated_at).getTime()) / 86400000) > 14).length} deals stagnants depuis plus de 14 jours`,
            ]
          : [],
      opportunities:
        signedDeals.length > 0
          ? [
              `Taux de conversion de ${Math.round(currentConversionRate * 100)}% — potentiel d'amélioration`,
            ]
          : [],
      recommendedActions: [
        "Relancer les deals inactifs",
        "Prioriser les deals à forte valeur",
      ],
    };
  }

  // What-if scenarios
  const whatIfScenarios = {
    conversionUp10: Math.round(avgWeightedPipeline * 1.1),
    conversionUp20: Math.round(avgWeightedPipeline * 1.2),
    conversionDown10: Math.round(avgWeightedPipeline * 0.9),
    avgDealValueUp15: Math.round(avgWeightedPipeline * 1.15),
  };

  return { dealInsights, globalInsights, whatIfScenarios };
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

export async function generateSetterReport(
  setterId?: string,
): Promise<SetterMetrics[]> {
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

  const { data: stages } = await supabase
    .from("pipeline_stages")
    .select("id, name");
  const signedStage = stages?.find((s) => s.name === "Client Signé");

  // Get all bookings
  const { data: allBookings } = await supabase
    .from("bookings")
    .select("id, assigned_to, status, scheduled_at, created_at")
    .in(
      "assigned_to",
      setters.map((s) => s.id),
    );

  // Get deals for closing contribution
  const { data: allDeals } = await supabase
    .from("deals")
    .select("id, assigned_to, stage_id, value");

  // Get setter weekly reports if they exist
  const { data: weeklyReports } = await supabase
    .from("setter_weekly_reports")
    .select("*")
    .in(
      "setter_id",
      setters.map((s) => s.id),
    )
    .gte("week_start", startOfPrevWeek.toISOString())
    .order("week_start", { ascending: false });

  const results: SetterMetrics[] = setters.map((setter) => {
    const bookings = (allBookings || []).filter(
      (b) => b.assigned_to === setter.id,
    );
    const deals = (allDeals || []).filter((d) => d.assigned_to === setter.id);

    // Current week bookings
    const currentWeekBookings = bookings.filter(
      (b) => new Date(b.scheduled_at || b.created_at) >= startOfCurrentWeek,
    );
    const prevWeekBookings = bookings.filter((b) => {
      const date = new Date(b.scheduled_at || b.created_at);
      return date >= startOfPrevWeek && date < startOfCurrentWeek;
    });

    // Use weekly reports for DM metrics if available, otherwise estimate from bookings
    const currentReport = (weeklyReports || []).find(
      (r) =>
        r.setter_id === setter.id &&
        new Date(r.week_start) >= startOfCurrentWeek,
    );
    const prevReport = (weeklyReports || []).find(
      (r) =>
        r.setter_id === setter.id &&
        new Date(r.week_start) >= startOfPrevWeek &&
        new Date(r.week_start) < startOfCurrentWeek,
    );

    const currentDMs =
      (currentReport?.metrics as Record<string, number>)?.dms_sent ||
      currentWeekBookings.length * 15;
    const currentResponses =
      (currentReport?.metrics as Record<string, number>)?.responses ||
      currentWeekBookings.length * 5;
    const prevDMs =
      (prevReport?.metrics as Record<string, number>)?.dms_sent ||
      prevWeekBookings.length * 15;
    const prevResponses =
      (prevReport?.metrics as Record<string, number>)?.responses ||
      prevWeekBookings.length * 5;

    const totalDMs = currentDMs + prevDMs + bookings.length * 10;
    const totalResponses =
      currentResponses + prevResponses + bookings.length * 3;
    const completedBookings = bookings.filter((b) => b.status === "completed");
    const showUpRate =
      bookings.length > 0
        ? (completedBookings.length / bookings.length) * 100
        : 0;

    const signedDeals = deals.filter((d) => d.stage_id === signedStage?.id);
    const closingContribution = signedDeals.reduce(
      (sum, d) => sum + (d.value || 0),
      0,
    );

    const currentShowUp =
      currentWeekBookings.length > 0
        ? (currentWeekBookings.filter((b) => b.status === "completed").length /
            currentWeekBookings.length) *
          100
        : 0;
    const prevShowUp =
      prevWeekBookings.length > 0
        ? (prevWeekBookings.filter((b) => b.status === "completed").length /
            prevWeekBookings.length) *
          100
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
      const engagementValue =
        (event.metadata as Record<string, number>)?.engagement || 1;
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

  const { data: stages } = await supabase
    .from("pipeline_stages")
    .select("id, name");
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

  const totalRevenue = (deals || []).reduce(
    (sum, d) => sum + (d.value || 0),
    0,
  );
  const totalClients = (clients || []).length;
  const revenuePerClient =
    totalClients > 0 ? Math.round(totalRevenue / totalClients) : 0;

  // Estimated CPA (mock: based on assumed marketing spend ratio)
  const estimatedCPA =
    totalClients > 0 ? Math.round((totalRevenue * 0.15) / totalClients) : 0;

  // Estimated LTV (average revenue * estimated retention of 18 months / avg deal cycle ~3 months)
  const estimatedLTV = Math.round(revenuePerClient * 6);

  // Average satisfaction from health scores
  const healthScores = (clients || []).map((c) => c.health_score || 50);
  const avgSatisfaction =
    healthScores.length > 0
      ? Math.round(
          healthScores.reduce((s, h) => s + h, 0) / healthScores.length,
        )
      : 0;

  // Per-client metrics
  const clientMetrics: ClientValueMetric[] = (clients || [])
    .map((client) => ({
      clientId: client.id,
      clientName: client.full_name || "Client",
      revenue: clientRevenueMap.get(client.id) || 0,
      healthScore: client.health_score || 50,
    }))
    .sort((a, b) => b.revenue - a.revenue);

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

// ---------- Cohort Analysis ----------

export interface CohortData {
  cohort: string; // YYYY-MM
  created: number;
  signed: number;
  signedValue: number;
  conversionRate: number;
  avgCycleDays: number;
}

// ---------- Source Tracking Complet (F49) ----------

export async function getSourceTracking() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { sources: [], summary: null };

  // Track sources from deals with utm params
  const { data: deals } = await supabase
    .from("deals")
    .select(
      "id, title, value, source, created_at, contact:contacts(full_name, utm_source, utm_medium, utm_campaign, referrer)",
    )
    .order("created_at", { ascending: false })
    .limit(200);

  const sourceMap: Record<
    string,
    { count: number; revenue: number; deals: string[] }
  > = {};

  for (const deal of deals || []) {
    const source = (deal as Record<string, unknown>).contact
      ? ((deal as Record<string, unknown>).contact as { utm_source?: string })
          .utm_source ||
        deal.source ||
        "direct"
      : deal.source || "direct";
    if (!sourceMap[source])
      sourceMap[source] = { count: 0, revenue: 0, deals: [] };
    sourceMap[source].count++;
    sourceMap[source].revenue += deal.value || 0;
    sourceMap[source].deals.push(deal.title);
  }

  const sources = Object.entries(sourceMap)
    .map(([name, data]) => ({
      name,
      count: data.count,
      revenue: data.revenue,
      avgDealValue: data.count > 0 ? Math.round(data.revenue / data.count) : 0,
      conversionRate: 0, // would need total visitors per source
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const totalRevenue = sources.reduce((s, x) => s + x.revenue, 0);
  const totalDeals = sources.reduce((s, x) => s + x.count, 0);

  return {
    sources,
    summary: { totalRevenue, totalDeals, topSource: sources[0]?.name || "N/A" },
  };
}

// ---------- Objections Récurrentes (F76) ----------

export async function getRecurringObjections() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { objections: [] };

  // Fetch recent prospect conversations
  const { data: conversations } = await supabase
    .from("dm_conversations")
    .select("messages")
    .order("last_message_at", { ascending: false })
    .limit(50);

  // Extract all prospect messages
  const prospectMessages: string[] = [];
  for (const conv of conversations || []) {
    const msgs =
      (conv.messages as Array<{ sender: string; content: string }>) || [];
    for (const msg of msgs) {
      if (msg.sender !== "damien" && msg.content) {
        prospectMessages.push(msg.content);
      }
    }
  }

  // Pattern matching for common objections
  const objectionPatterns = [
    {
      pattern: /pas (le |de )?temps|trop occup|pas dispo/i,
      category: "Manque de temps",
      suggestion:
        "Propose un créneau court (15 min) et montre la valeur immédiate",
    },
    {
      pattern: /trop cher|budget|pas les moyens|prix/i,
      category: "Prix / Budget",
      suggestion: "Reformule en ROI : 'Combien ça te coûte de ne pas agir ?'",
    },
    {
      pattern: /pas (intéressé|besoin)|ça (m'|me )intéresse pas/i,
      category: "Pas intéressé",
      suggestion:
        "Identifie le vrai blocage : 'Je comprends, qu'est-ce qui te manque aujourd'hui ?'",
    },
    {
      pattern: /je (vais )?réfléchir|faut que j'y pense|laisse.moi/i,
      category: "Réflexion",
      suggestion:
        "Crée l'urgence : 'Bien sûr ! Qu'est-ce qui te ferait passer à l'action maintenant ?'",
    },
    {
      pattern: /déjà (un |quelqu'un|essayé)|j'ai déjà/i,
      category: "A déjà essayé",
      suggestion:
        "Différencie ton approche : 'Qu'est-ce qui n'a pas marché la dernière fois ?'",
    },
    {
      pattern: /c'est une arnaque|spam|confiance|méfian/i,
      category: "Confiance / Crédibilité",
      suggestion: "Social proof : partage un témoignage ou un résultat concret",
    },
    {
      pattern: /plus tard|pas maintenant|quand|un jour/i,
      category: "Timing",
      suggestion:
        "Fixe un RDV précis : 'OK, je te recontacte quand exactement ?'",
    },
  ];

  const objectionCounts: Record<
    string,
    { count: number; category: string; suggestion: string; examples: string[] }
  > = {};

  for (const msg of prospectMessages) {
    for (const { pattern, category, suggestion } of objectionPatterns) {
      if (pattern.test(msg)) {
        if (!objectionCounts[category]) {
          objectionCounts[category] = {
            count: 0,
            category,
            suggestion,
            examples: [],
          };
        }
        objectionCounts[category].count++;
        if (objectionCounts[category].examples.length < 3) {
          objectionCounts[category].examples.push(msg.slice(0, 100));
        }
      }
    }
  }

  const objections = Object.values(objectionCounts).sort(
    (a, b) => b.count - a.count,
  );

  return { objections, totalMessages: prospectMessages.length };
}

export async function getCohortData(): Promise<CohortData[]> {
  const supabase = await createClient();

  const { data: stages } = await supabase
    .from("pipeline_stages")
    .select("id, name");

  const signedStage = stages?.find((s) => s.name === "Client Signé");

  // Look back 6 months
  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const { data: allDeals } = await supabase
    .from("deals")
    .select("id, stage_id, value, created_at, updated_at")
    .gte("created_at", sixMonthsAgo.toISOString())
    .order("created_at", { ascending: true });

  if (!allDeals || allDeals.length === 0) return [];

  // Group deals by creation month (cohort)
  const cohortMap = new Map<
    string,
    {
      created: number;
      signed: number;
      signedValue: number;
      cycleDaysSum: number;
      signedCount: number;
    }
  >();

  for (const deal of allDeals) {
    const createdDate = new Date(deal.created_at);
    const cohortKey = `${createdDate.getFullYear()}-${String(createdDate.getMonth() + 1).padStart(2, "0")}`;

    if (!cohortMap.has(cohortKey)) {
      cohortMap.set(cohortKey, {
        created: 0,
        signed: 0,
        signedValue: 0,
        cycleDaysSum: 0,
        signedCount: 0,
      });
    }

    const cohort = cohortMap.get(cohortKey)!;
    cohort.created++;

    if (deal.stage_id === signedStage?.id) {
      cohort.signed++;
      cohort.signedValue += deal.value || 0;

      // Calculate cycle time in days
      const created = new Date(deal.created_at).getTime();
      const updated = new Date(deal.updated_at).getTime();
      const cycleDays = Math.max(
        1,
        Math.round((updated - created) / (1000 * 60 * 60 * 24)),
      );
      cohort.cycleDaysSum += cycleDays;
      cohort.signedCount++;
    }
  }

  // Build result sorted by cohort month
  const result: CohortData[] = [];
  const sortedKeys = Array.from(cohortMap.keys()).sort();

  for (const key of sortedKeys) {
    const c = cohortMap.get(key)!;
    result.push({
      cohort: key,
      created: c.created,
      signed: c.signed,
      signedValue: c.signedValue,
      conversionRate:
        c.created > 0 ? Math.round((c.signed / c.created) * 100) : 0,
      avgCycleDays:
        c.signedCount > 0 ? Math.round(c.cycleDaysSum / c.signedCount) : 0,
    });
  }

  return result;
}
