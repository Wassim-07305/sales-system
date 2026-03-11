"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  ArrowLeft,
  TrendingUp,
  DollarSign,
  CalendarDays,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Brain,
  AlertTriangle,
  Lightbulb,
  ShieldAlert,
  Sparkles,
  SlidersHorizontal,
} from "lucide-react";
import {
  LineChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ComposedChart,
} from "recharts";
import { cn } from "@/lib/utils";
import type { RevenueProjectionResult, AIForecastResult } from "@/lib/actions/analytics-v2";

interface ProjectionsViewProps {
  data: RevenueProjectionResult;
  aiData: AIForecastResult | null;
}

export function ProjectionsView({ data, aiData }: ProjectionsViewProps) {
  const {
    chartData,
    projectedNextMonth,
    projectedNextQuarter,
    pipelineWeightedValue,
    trendSlope,
    historicalMonths,
    projectedMonths,
    pipelineDeals,
  } = data;

  const trendPositive = trendSlope >= 0;
  const hasConfidenceData = chartData.some((d) => d.optimistic !== null);

  return (
    <div>
      <PageHeader
        title="Projections de Revenus & IA"
        description="Analyse de tendance, projections avec intervalles de confiance et insights IA"
      >
        <Link href="/analytics">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
        </Link>
      </PageHeader>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-lg bg-brand/10 flex items-center justify-center">
                <CalendarDays className="h-5 w-5 text-brand" />
              </div>
            </div>
            <p className="text-2xl font-bold">
              {projectedNextMonth.toLocaleString("fr-FR")} &euro;
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              CA projeté mois prochain
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-blue-500" />
              </div>
            </div>
            <p className="text-2xl font-bold">
              {projectedNextQuarter.toLocaleString("fr-FR")} &euro;
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              CA projeté prochain trimestre
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Target className="h-5 w-5 text-purple-500" />
              </div>
            </div>
            <p className="text-2xl font-bold">
              {pipelineWeightedValue.toLocaleString("fr-FR")} &euro;
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Valeur pipeline pondérée
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-lg bg-brand/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-brand" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold">
                {trendSlope >= 0 ? "+" : ""}
                {trendSlope.toLocaleString("fr-FR")} &euro;
              </p>
              {trendPositive ? (
                <ArrowUpRight className="h-4 w-4 text-green-600" />
              ) : (
                <ArrowDownRight className="h-4 w-4 text-red-500" />
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Tendance mensuelle
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Chart with confidence intervals */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Historique et projections de revenus
            {hasConfidenceData && (
              <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                Intervalle de confiance 90%
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={((value: any, name: any) => {
                    const labels: Record<string, string> = {
                      actual: "CA réel",
                      projected: "CA projeté",
                      trend: "Tendance",
                      optimistic: "Scénario optimiste",
                      pessimistic: "Scénario pessimiste",
                    };
                    return [
                      `${Number(value || 0).toLocaleString("fr-FR")} \u20ac`,
                      labels[String(name)] || String(name),
                    ];
                  }) as any}
                />
                <Legend
                  formatter={(value: string) => {
                    const labels: Record<string, string> = {
                      actual: "CA réel",
                      projected: "CA projeté",
                      trend: "Tendance",
                      optimistic: "Optimiste",
                      pessimistic: "Pessimiste",
                    };
                    return labels[value] || value;
                  }}
                />
                {/* Confidence interval band */}
                <Area
                  type="monotone"
                  dataKey="optimistic"
                  stroke="none"
                  fill="#60a5fa"
                  fillOpacity={0.08}
                  connectNulls={false}
                  name="optimistic"
                />
                <Area
                  type="monotone"
                  dataKey="pessimistic"
                  stroke="none"
                  fill="#ffffff"
                  fillOpacity={0}
                  connectNulls={false}
                  name="pessimistic"
                />
                <Line
                  type="monotone"
                  dataKey="optimistic"
                  stroke="#60a5fa"
                  strokeWidth={1}
                  strokeDasharray="4 4"
                  dot={false}
                  connectNulls={false}
                  name="optimistic"
                />
                <Line
                  type="monotone"
                  dataKey="pessimistic"
                  stroke="#f97316"
                  strokeWidth={1}
                  strokeDasharray="4 4"
                  dot={false}
                  connectNulls={false}
                  name="pessimistic"
                />
                <Line
                  type="monotone"
                  dataKey="actual"
                  stroke="#7af17a"
                  strokeWidth={2.5}
                  dot={{ fill: "#7af17a", r: 5 }}
                  connectNulls={false}
                  name="actual"
                />
                <Line
                  type="monotone"
                  dataKey="projected"
                  stroke="#60a5fa"
                  strokeWidth={2.5}
                  strokeDasharray="8 4"
                  dot={{ fill: "#60a5fa", r: 5 }}
                  connectNulls={false}
                  name="projected"
                />
                <Line
                  type="monotone"
                  dataKey="trend"
                  stroke="#a1a1aa"
                  strokeWidth={1.5}
                  strokeDasharray="3 3"
                  dot={false}
                  name="trend"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* AI Insights Section */}
      {aiData && (
        <>
          <div className="flex items-center gap-2 mb-4">
            <Brain className="h-5 w-5 text-purple-500" />
            <h2 className="text-lg font-semibold">Insights IA</h2>
            <span className="text-xs text-muted-foreground bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
              Analyse automatique
            </span>
          </div>

          {/* Global AI Summary */}
          <Card className="mb-6 border-purple-200/50">
            <CardContent className="p-5">
              <p className="text-sm text-foreground leading-relaxed mb-4">
                {aiData.globalInsights.summary}
              </p>
              <div className="grid sm:grid-cols-3 gap-4">
                {aiData.globalInsights.topRisks.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <ShieldAlert className="h-4 w-4 text-red-500" />
                      <span className="text-xs font-semibold text-red-600 uppercase">Risques</span>
                    </div>
                    <ul className="space-y-1">
                      {aiData.globalInsights.topRisks.map((r, i) => (
                        <li key={i} className="text-xs text-muted-foreground">{r}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {aiData.globalInsights.opportunities.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <Lightbulb className="h-4 w-4 text-amber-500" />
                      <span className="text-xs font-semibold text-amber-600 uppercase">Opportunités</span>
                    </div>
                    <ul className="space-y-1">
                      {aiData.globalInsights.opportunities.map((o, i) => (
                        <li key={i} className="text-xs text-muted-foreground">{o}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {aiData.globalInsights.recommendedActions.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <Sparkles className="h-4 w-4 text-brand" />
                      <span className="text-xs font-semibold text-green-600 uppercase">Actions</span>
                    </div>
                    <ul className="space-y-1">
                      {aiData.globalInsights.recommendedActions.map((a, i) => (
                        <li key={i} className="text-xs text-muted-foreground">{a}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* What-If Scenarios */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <SlidersHorizontal className="h-4 w-4" />
                Scénarios What-If
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200/50">
                  <p className="text-xs text-muted-foreground mb-1">Conversion +10%</p>
                  <p className="text-lg font-bold text-green-700 dark:text-green-400">
                    {aiData.whatIfScenarios.conversionUp10.toLocaleString("fr-FR")} &euro;
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200/50">
                  <p className="text-xs text-muted-foreground mb-1">Conversion +20%</p>
                  <p className="text-lg font-bold text-green-700 dark:text-green-400">
                    {aiData.whatIfScenarios.conversionUp20.toLocaleString("fr-FR")} &euro;
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200/50">
                  <p className="text-xs text-muted-foreground mb-1">Conversion -10%</p>
                  <p className="text-lg font-bold text-red-700 dark:text-red-400">
                    {aiData.whatIfScenarios.conversionDown10.toLocaleString("fr-FR")} &euro;
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200/50">
                  <p className="text-xs text-muted-foreground mb-1">Panier moyen +15%</p>
                  <p className="text-lg font-bold text-blue-700 dark:text-blue-400">
                    {aiData.whatIfScenarios.avgDealValueUp15.toLocaleString("fr-FR")} &euro;
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Deal-level AI Insights */}
          {aiData.dealInsights.length > 0 && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertTriangle className="h-4 w-4" />
                  Analyse IA par deal
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-4 font-medium">Deal</th>
                        <th className="text-right p-4 font-medium">Valeur</th>
                        <th className="text-center p-4 font-medium">Risque churn</th>
                        <th className="text-left p-4 font-medium">Action recommandée</th>
                        <th className="text-center p-4 font-medium">Anomalie</th>
                      </tr>
                    </thead>
                    <tbody>
                      {aiData.dealInsights.map((deal, i) => (
                        <tr key={i} className="border-b last:border-0">
                          <td className="p-4 font-medium">{deal.dealTitle}</td>
                          <td className="p-4 text-right">
                            {deal.dealValue.toLocaleString("fr-FR")} &euro;
                          </td>
                          <td className="p-4 text-center">
                            <span
                              className={cn(
                                "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                                deal.churnRisk === "low"
                                  ? "bg-green-100 text-green-700"
                                  : deal.churnRisk === "medium"
                                    ? "bg-yellow-100 text-yellow-700"
                                    : "bg-red-100 text-red-700"
                              )}
                            >
                              {deal.churnRisk === "low" ? "Faible" : deal.churnRisk === "medium" ? "Moyen" : "Élevé"}
                              {" "}{deal.churnRiskScore}%
                            </span>
                          </td>
                          <td className="p-4 text-sm text-muted-foreground max-w-[250px]">
                            {deal.nextBestAction}
                          </td>
                          <td className="p-4 text-center">
                            {deal.isAnomaly ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700" title={deal.anomalyReason || ""}>
                                <AlertTriangle className="h-3 w-3" />
                                Oui
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Month-by-month breakdown table */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Historique (6 derniers mois)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-4 font-medium">Mois</th>
                    <th className="text-right p-4 font-medium">CA réalisé</th>
                  </tr>
                </thead>
                <tbody>
                  {historicalMonths.map((m, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="p-4 font-medium capitalize">{m.month}</td>
                      <td className="p-4 text-right">
                        {m.value.toLocaleString("fr-FR")} &euro;
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-muted/30 font-semibold">
                    <td className="p-4">Total</td>
                    <td className="p-4 text-right">
                      {historicalMonths
                        .reduce((s, m) => s + m.value, 0)
                        .toLocaleString("fr-FR")}{" "}
                      &euro;
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Projections (3 prochains mois)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-4 font-medium">Mois</th>
                    <th className="text-right p-4 font-medium">CA projeté</th>
                  </tr>
                </thead>
                <tbody>
                  {projectedMonths.map((m, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="p-4 font-medium capitalize">{m.month}</td>
                      <td className="p-4 text-right text-blue-500">
                        {m.value.toLocaleString("fr-FR")} &euro;
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-muted/30 font-semibold">
                    <td className="p-4">Total trimestre</td>
                    <td className="p-4 text-right text-blue-500">
                      {projectedNextQuarter.toLocaleString("fr-FR")} &euro;
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline Deals */}
      <Card>
        <CardHeader>
          <CardTitle>Pipeline pondéré — Deals en cours</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {pipelineDeals.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="font-medium">Aucun deal dans le pipeline</p>
              <p className="text-sm">
                Les projections pipeline se baseront sur vos deals actifs.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-4 font-medium">Deal</th>
                    <th className="text-right p-4 font-medium">Valeur</th>
                    <th className="text-right p-4 font-medium">Probabilité</th>
                    <th className="text-right p-4 font-medium">Valeur pondérée</th>
                  </tr>
                </thead>
                <tbody>
                  {pipelineDeals.map((deal, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="p-4 font-medium">{deal.title}</td>
                      <td className="p-4 text-right">
                        {deal.value.toLocaleString("fr-FR")} &euro;
                      </td>
                      <td className="p-4 text-right">
                        <span
                          className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                            deal.probability >= 70
                              ? "bg-green-100 text-green-700"
                              : deal.probability >= 40
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-red-100 text-red-700"
                          )}
                        >
                          {deal.probability}%
                        </span>
                      </td>
                      <td className="p-4 text-right font-medium">
                        {deal.weighted.toLocaleString("fr-FR")} &euro;
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-muted/30 font-semibold">
                    <td className="p-4" colSpan={3}>
                      Total pipeline pondéré
                    </td>
                    <td className="p-4 text-right">
                      {pipelineWeightedValue.toLocaleString("fr-FR")} &euro;
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
