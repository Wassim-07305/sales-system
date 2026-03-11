"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  ArrowLeft,
  DollarSign,
  Target,
  TrendingUp,
  Heart,
  Users,
} from "lucide-react";
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
import { cn } from "@/lib/utils";

interface ClientValueMetric {
  clientId: string;
  clientName: string;
  revenue: number;
  healthScore: number;
}

interface ValueReportResult {
  revenuePerClient: number;
  estimatedCPA: number;
  estimatedLTV: number;
  avgSatisfaction: number;
  totalRevenue: number;
  totalClients: number;
  clients: ClientValueMetric[];
  healthDistribution: { range: string; count: number }[];
}

function getHealthColor(score: number): string {
  if (score >= 80) return "#22c55e";
  if (score >= 60) return "#7af17a";
  if (score >= 40) return "#f59e0b";
  if (score >= 20) return "#f97316";
  return "#ef4444";
}

function getDistributionColor(range: string): string {
  const colors: Record<string, string> = {
    "0-20": "#ef4444",
    "21-40": "#f97316",
    "41-60": "#f59e0b",
    "61-80": "#7af17a",
    "81-100": "#22c55e",
  };
  return colors[range] || "#6b7280";
}

export function ValueReportsView({ data }: { data: ValueReportResult }) {
  // ROI = (Revenue - CPA * clients) / (CPA * clients) * 100
  const totalInvestment = data.estimatedCPA * data.totalClients;
  const roi = totalInvestment > 0
    ? Math.round(((data.totalRevenue - totalInvestment) / totalInvestment) * 100)
    : 0;

  const ltvCacRatio = data.estimatedCPA > 0
    ? (data.estimatedLTV / data.estimatedCPA).toFixed(1)
    : "N/A";

  // Top 10 clients for chart
  const topClients = data.clients.slice(0, 10).map((c) => ({
    name: c.clientName.length > 15 ? c.clientName.substring(0, 15) + "..." : c.clientName,
    revenue: c.revenue,
    healthScore: c.healthScore,
  }));

  const kpis = [
    {
      title: "Revenue par client",
      value: `${data.revenuePerClient.toLocaleString("fr-FR")} \u20ac`,
      icon: DollarSign,
      description: "Moyenne",
    },
    {
      title: "Coût d'acquisition estimé",
      value: `${data.estimatedCPA.toLocaleString("fr-FR")} \u20ac`,
      icon: Target,
      description: "CPA moyen",
    },
    {
      title: "LTV estimée",
      value: `${data.estimatedLTV.toLocaleString("fr-FR")} \u20ac`,
      icon: TrendingUp,
      description: "Valeur vie client",
    },
    {
      title: "Score satisfaction moyen",
      value: `${data.avgSatisfaction}/100`,
      icon: Heart,
      description: "Basé sur le health score",
    },
  ];

  return (
    <div>
      <PageHeader
        title="Rapports de Valeur"
        description="ROI et valeur perçue mensuelle"
      >
        <Link href="/analytics">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
        </Link>
      </PageHeader>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.title}>
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-10 w-10 rounded-lg bg-brand/10 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-brand" />
                  </div>
                </div>
                <p className="text-2xl font-bold">{kpi.value}</p>
                <p className="text-sm text-muted-foreground mt-1">{kpi.title}</p>
                <p className="text-xs text-muted-foreground/70">{kpi.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ROI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="p-5 text-center">
            <p className="text-sm text-muted-foreground mb-1">ROI global</p>
            <p className={cn(
              "text-3xl font-bold",
              roi >= 0 ? "text-green-600" : "text-red-500"
            )}>
              {roi}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 text-center">
            <p className="text-sm text-muted-foreground mb-1">Ratio LTV / CAC</p>
            <p className="text-3xl font-bold text-brand">{ltvCacRatio}x</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 text-center">
            <p className="text-sm text-muted-foreground mb-1">Clients totaux</p>
            <div className="flex items-center justify-center gap-2">
              <Users className="h-5 w-5 text-brand" />
              <p className="text-3xl font-bold">{data.totalClients}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        {/* Revenue per Client Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue par client (Top 10)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[350px]">
              {topClients.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topClients} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                    <XAxis
                      type="number"
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={120}
                      tick={{ fontSize: 12 }}
                    />
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    <Tooltip
                      formatter={(value: any) => [
                        `${Number(value).toLocaleString("fr-FR")} \u20ac`,
                        "Revenue",
                      ]}
                    />
                    <Bar dataKey="revenue" radius={[0, 4, 4, 0]} name="Revenue">
                      {topClients.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={getHealthColor(entry.healthScore)}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  Aucun client trouvé
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Health Score Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Distribution satisfaction client</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[350px]">
              {data.healthDistribution.some((d) => d.count > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.healthDistribution}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                    <XAxis dataKey="range" />
                    <YAxis allowDecimals={false} />
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    <Tooltip
                      formatter={(value: any) => [value, "Clients"]}
                      labelFormatter={(label) => `Score: ${label}`}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]} name="Clients">
                      {data.healthDistribution.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={getDistributionColor(entry.range)}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  Aucune donnée de satisfaction
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Client Details Table (show all with revenue > 0) */}
      {data.clients.filter((c) => c.revenue > 0).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Détails par client</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-4 font-medium">Client</th>
                    <th className="text-right p-4 font-medium">Revenue</th>
                    <th className="text-right p-4 font-medium">Health Score</th>
                    <th className="text-right p-4 font-medium">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {data.clients
                    .filter((c) => c.revenue > 0)
                    .map((client) => (
                      <tr key={client.clientId} className="border-b last:border-0">
                        <td className="p-4 font-medium">{client.clientName}</td>
                        <td className="p-4 text-right">
                          {client.revenue.toLocaleString("fr-FR")} &euro;
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${client.healthScore}%`,
                                  backgroundColor: getHealthColor(client.healthScore),
                                }}
                              />
                            </div>
                            <span className="text-xs font-medium w-8 text-right">
                              {client.healthScore}
                            </span>
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          <span
                            className={cn(
                              "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                              client.healthScore >= 70
                                ? "bg-green-100 text-green-700"
                                : client.healthScore >= 40
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-red-100 text-red-700"
                            )}
                          >
                            {client.healthScore >= 70
                              ? "Satisfait"
                              : client.healthScore >= 40
                                ? "Neutre"
                                : "A risque"}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
