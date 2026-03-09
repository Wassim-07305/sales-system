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
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { cn } from "@/lib/utils";
import type { RevenueProjectionResult } from "@/lib/actions/analytics-v2";

export function ProjectionsView({ data }: { data: RevenueProjectionResult }) {
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

  return (
    <div>
      <PageHeader
        title="Projections de Revenus"
        description="Analyse de tendance et projections basées sur l'historique et le pipeline"
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

      {/* Chart */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Historique et projections de revenus</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
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
                    };
                    return labels[value] || value;
                  }}
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
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

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
