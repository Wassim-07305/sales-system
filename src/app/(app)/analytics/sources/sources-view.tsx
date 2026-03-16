"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, DollarSign, Hash, Trophy } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface Source {
  name: string;
  count: number;
  revenue: number;
  avgDealValue: number;
  conversionRate: number;
}

interface Summary {
  totalRevenue: number;
  totalDeals: number;
  topSource: string;
}

function formatCurrency(amount: number) {
  return amount.toLocaleString("fr-FR") + " \u20AC";
}

const CHART_COLORS = [
  "#7af17a",
  "#60a5fa",
  "#f59e0b",
  "#a78bfa",
  "#f87171",
  "#34d399",
  "#fb923c",
];

export function SourcesView({
  sources,
  summary,
}: {
  sources: Source[];
  summary: Summary | null;
}) {
  const chartData = sources.slice(0, 10).map((s, i) => ({
    name: s.name,
    revenue: s.revenue,
    fill: CHART_COLORS[i % CHART_COLORS.length],
  }));

  return (
    <div>
      <PageHeader
        title="Sources d'acquisition"
        description="Tracking complet des sources de vos deals avec attribution UTM"
      >
        <Link href="/analytics">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
        </Link>
      </PageHeader>

      {/* Summary cards */}
      {summary && (
        <div className="grid sm:grid-cols-3 gap-4 mb-8">
          <Card className="border-border/50 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-xl bg-[#7af17a]/10 ring-1 ring-[#7af17a]/20 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-[#7af17a]" />
                </div>
              </div>
              <p className="text-2xl font-bold tracking-tight">
                {formatCurrency(summary.totalRevenue)}
              </p>
              <p className="text-[11px] font-medium text-muted-foreground mt-1 uppercase tracking-wider">
                Total CA
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/50 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-xl bg-blue-500/10 ring-1 ring-blue-500/20 flex items-center justify-center">
                  <Hash className="h-5 w-5 text-blue-500" />
                </div>
              </div>
              <p className="text-2xl font-bold tracking-tight">
                {summary.totalDeals}
              </p>
              <p className="text-[11px] font-medium text-muted-foreground mt-1 uppercase tracking-wider">
                Total Deals
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/50 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-xl bg-amber-500/10 ring-1 ring-amber-500/20 flex items-center justify-center">
                  <Trophy className="h-5 w-5 text-amber-500" />
                </div>
              </div>
              <p className="text-2xl font-bold tracking-tight capitalize">
                {summary.topSource}
              </p>
              <p className="text-[11px] font-medium text-muted-foreground mt-1 uppercase tracking-wider">
                Source #1
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        {/* Bar chart */}
        <Card className="border-border/50 hover:shadow-md transition-all overflow-hidden">
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              CA par source
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[350px]">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    layout="vertical"
                    margin={{ left: 20 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(255,255,255,0.1)"
                    />
                    <XAxis
                      type="number"
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                      stroke="rgba(255,255,255,0.5)"
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={100}
                      stroke="rgba(255,255,255,0.5)"
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip
                      formatter={(value) => [
                        formatCurrency(Number(value)),
                        "CA",
                      ]}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                      }}
                    />
                    <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                      {chartData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  Aucune donnée disponible
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="border-border/50 hover:shadow-md transition-all overflow-hidden">
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Détail par source
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left p-4 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                      Source
                    </th>
                    <th className="text-right p-4 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                      Deals
                    </th>
                    <th className="text-right p-4 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                      CA total
                    </th>
                    <th className="text-right p-4 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                      CA moyen/deal
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sources.map((source, i) => (
                    <tr
                      key={source.name}
                      className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div
                            className="h-3 w-3 rounded-full"
                            style={{
                              backgroundColor:
                                CHART_COLORS[i % CHART_COLORS.length],
                            }}
                          />
                          <span className="font-medium capitalize">
                            {source.name}
                          </span>
                          {i === 0 && (
                            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">
                              Top
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-right">{source.count}</td>
                      <td className="p-4 text-right">
                        {formatCurrency(source.revenue)}
                      </td>
                      <td className="p-4 text-right font-medium">
                        {formatCurrency(source.avgDealValue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {sources.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">
                Aucune source de deals trouvée.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
