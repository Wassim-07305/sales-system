"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  DollarSign,
  Users,
  TrendingUp,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  Funnel,
  PieChart as PieChartIcon,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface AnalyticsData {
  caThisMonth: number;
  caChange: number;
  activeClients: number;
  totalClients: number;
  pipelineValue: number;
  conversionRate: number;
  churnRate: number;
  revenueByMonth: { month: string; value: number }[];
  dealsByMonth: { month: string; count: number }[];
}

interface TeamMember {
  id: string;
  name: string;
  role: string;
  bookingsCount: number;
  showUpRate: number;
  closingRate: number;
  revenue: number;
}

export function AnalyticsView({
  analytics,
  teamPerformance,
}: {
  analytics: AnalyticsData;
  teamPerformance: TeamMember[];
}) {
  const stats = [
    {
      title: "CA du mois",
      value: `${analytics.caThisMonth.toLocaleString("fr-FR")} €`,
      change: analytics.caChange,
      icon: DollarSign,
      negative: false,
    },
    {
      title: "Clients actifs",
      value: analytics.activeClients.toString(),
      change: null,
      icon: Users,
      negative: false,
    },
    {
      title: "Pipeline",
      value: `${analytics.pipelineValue.toLocaleString("fr-FR")} €`,
      change: null,
      icon: BarChart3,
      negative: false,
    },
    {
      title: "Taux conversion",
      value: `${analytics.conversionRate.toFixed(1)}%`,
      change: null,
      icon: TrendingUp,
      negative: false,
    },
    {
      title: "Churn rate",
      value: `${analytics.churnRate.toFixed(1)}%`,
      change: null,
      icon: AlertTriangle,
      negative: true,
    },
  ];

  return (
    <div>
      <PageHeader title="Analytics" description="Tableaux de bord et métriques de performance">
        <div className="flex gap-2">
          <Link href="/analytics/funnel">
            <Button variant="outline" size="sm">
              <Funnel className="h-4 w-4 mr-2" />
              Funnel
            </Button>
          </Link>
          <Link href="/analytics/sources">
            <Button variant="outline" size="sm">
              <PieChartIcon className="h-4 w-4 mr-2" />
              Sources
            </Button>
          </Link>
          <Link href="/analytics/projections">
            <Button variant="outline" size="sm">
              <TrendingUp className="h-4 w-4 mr-2" />
              Projections
            </Button>
          </Link>
          <Link href="/analytics/benchmarking">
            <Button variant="outline" size="sm">
              <BarChart3 className="h-4 w-4 mr-2" />
              Benchmarking
            </Button>
          </Link>
        </div>
      </PageHeader>

      {/* Big numbers */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className={`h-10 w-10 rounded-lg ${stat.negative ? "bg-red-500/10" : "bg-brand/10"} flex items-center justify-center`}>
                    <Icon className={`h-5 w-5 ${stat.negative ? "text-red-500" : "text-brand"}`} />
                  </div>
                  {stat.change !== null && (
                    <div className={`flex items-center gap-1 text-xs font-medium ${stat.change >= 0 ? "text-green-600" : "text-red-500"}`}>
                      {stat.change >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                      {Math.abs(stat.change).toFixed(1)}%
                    </div>
                  )}
                </div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-sm text-muted-foreground mt-1">{stat.title}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Évolution du CA (6 mois)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.revenueByMonth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value) => [`${Number(value).toLocaleString("fr-FR")} €`, "CA"]} />
                  <Area type="monotone" dataKey="value" stroke="#7af17a" fill="#7af17a" fillOpacity={0.15} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Deals conclus par mois</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.dealsByMonth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                  <XAxis dataKey="month" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#7af17a" radius={[4, 4, 0, 0]} name="Deals" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team Performance */}
      {teamPerformance.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Performance Équipe</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-4 font-medium">Membre</th>
                    <th className="text-left p-4 font-medium">Rôle</th>
                    <th className="text-right p-4 font-medium">Appels bookés</th>
                    <th className="text-right p-4 font-medium">Show-up</th>
                    <th className="text-right p-4 font-medium">Closing</th>
                    <th className="text-right p-4 font-medium">CA généré</th>
                  </tr>
                </thead>
                <tbody>
                  {teamPerformance.map((member) => (
                    <tr key={member.id} className="border-b last:border-0">
                      <td className="p-4 font-medium">{member.name}</td>
                      <td className="p-4 capitalize text-muted-foreground">{member.role}</td>
                      <td className="p-4 text-right">{member.bookingsCount}</td>
                      <td className="p-4 text-right">{member.showUpRate.toFixed(0)}%</td>
                      <td className="p-4 text-right">{member.closingRate.toFixed(0)}%</td>
                      <td className="p-4 text-right font-medium">{member.revenue.toLocaleString("fr-FR")} €</td>
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
