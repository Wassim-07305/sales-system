"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  ArrowLeft,
  TrendingUp,
  DollarSign,
  BarChart3,
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
} from "recharts";
import { cn } from "@/lib/utils";

interface MonthlyProjection {
  month: string;
  projected: number;
  cumulative: number;
}

interface ProjectionResult {
  monthly: MonthlyProjection[];
  totalProjected: number;
  avgMonthly: number;
  growthRate: number;
  deals: { title: string; value: number; probability: number; projected: number }[];
}

type ScenarioKey = "conservative" | "moderate" | "optimistic";

const scenarioLabels: Record<ScenarioKey, string> = {
  conservative: "Conservateur",
  moderate: "Modéré",
  optimistic: "Optimiste",
};

const scenarioColors: Record<ScenarioKey, string> = {
  conservative: "#f59e0b",
  moderate: "#7af17a",
  optimistic: "#3b82f6",
};

export function ProjectionsView({
  scenarios,
}: {
  scenarios: Record<ScenarioKey, ProjectionResult>;
}) {
  const [activeScenario, setActiveScenario] = useState<ScenarioKey>("moderate");
  const current = scenarios[activeScenario];

  return (
    <div>
      <PageHeader
        title="Projections de Revenus"
        description="Estimations basées sur votre pipeline actuel"
      >
        <Link href="/analytics">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
        </Link>
      </PageHeader>

      {/* Scenario Selector */}
      <div className="flex gap-2 mb-6">
        {(Object.keys(scenarioLabels) as ScenarioKey[]).map((key) => (
          <Button
            key={key}
            variant={activeScenario === key ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveScenario(key)}
            className={cn(
              activeScenario === key && "bg-brand text-brand-dark hover:bg-brand/90"
            )}
          >
            {scenarioLabels[key]}
          </Button>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-lg bg-brand/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-brand" />
              </div>
            </div>
            <p className="text-2xl font-bold">
              {current.totalProjected.toLocaleString("fr-FR")} &euro;
            </p>
            <p className="text-sm text-muted-foreground mt-1">CA projeté total (6 mois)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-lg bg-brand/10 flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-brand" />
              </div>
            </div>
            <p className="text-2xl font-bold">
              {current.avgMonthly.toLocaleString("fr-FR")} &euro;
            </p>
            <p className="text-sm text-muted-foreground mt-1">CA mensuel moyen</p>
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
              <p className="text-2xl font-bold">{current.growthRate}%</p>
              {current.growthRate >= 0 ? (
                <ArrowUpRight className="h-4 w-4 text-green-600" />
              ) : (
                <ArrowDownRight className="h-4 w-4 text-red-500" />
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">Croissance projetée</p>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Projection sur 6 mois — {scenarioLabels[activeScenario]}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={current.monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                <Tooltip
                  formatter={(value: any) => [
                    `${Number(value).toLocaleString("fr-FR")} \u20ac`,
                    "Projection",
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="projected"
                  stroke={scenarioColors[activeScenario]}
                  strokeWidth={2}
                  dot={{ fill: scenarioColors[activeScenario], r: 4 }}
                  name="Mensuel"
                />
                <Line
                  type="monotone"
                  dataKey="cumulative"
                  stroke={scenarioColors[activeScenario]}
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                  name="Cumulatif"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Pipeline Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Deals contribuant aux projections</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {current.deals.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="font-medium">Aucun deal dans le pipeline</p>
              <p className="text-sm">Les projections se baseront sur vos deals actifs.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-4 font-medium">Deal</th>
                    <th className="text-right p-4 font-medium">Valeur</th>
                    <th className="text-right p-4 font-medium">Probabilité</th>
                    <th className="text-right p-4 font-medium">Contribution projetée</th>
                  </tr>
                </thead>
                <tbody>
                  {current.deals.map((deal, i) => (
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
                        {deal.projected.toLocaleString("fr-FR")} &euro;
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
