"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  Target,
  Trophy,
  Calendar,
  ArrowLeft,
  Medal,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  Legend,
} from "recharts";

interface PerformanceMetric {
  label: string;
  current: number;
  target: number;
  previous: number;
  trend: number | null;
  unit: string;
}

interface ObjectiveProgress {
  id: string;
  title: string;
  category: string;
  progress: number;
  status: string;
  daysLeft: number;
}

interface PersonalPerformanceReport {
  period: string;
  metrics: PerformanceMetric[];
  weeklyData: Array<{ week: string; revenue: number; deals: number; bookings: number }>;
  objectivesProgress: ObjectiveProgress[];
  ranking: {
    position: number;
    total: number;
    metric: string;
  };
}

const STATUS_CONFIG: Record<string, { color: string; icon: typeof CheckCircle }> = {
  in_progress: {
    color: "bg-[#7af17a]/20 text-[#7af17a] border-[#7af17a]/30",
    icon: TrendingUp,
  },
  at_risk: {
    color: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    icon: AlertTriangle,
  },
  overdue: {
    color: "bg-red-500/20 text-red-400 border-red-500/30",
    icon: Clock,
  },
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function PerformanceView({
  report,
  userName,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  userRole,
}: {
  report: PersonalPerformanceReport;
  userName: string;
  userRole: string;
}) {
  // Prepare radial chart data for goal progress
  const radialData = report.metrics.map((m, index) => {
    const progress = Math.min(100, Math.round((m.current / m.target) * 100));
    const colors = ["#7af17a", "#60a5fa", "#f59e0b", "#a78bfa"];
    return {
      name: m.label,
      value: progress,
      fill: colors[index % colors.length],
    };
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mon rapport de performance"
        description={`${userName} - ${report.period}`}
      >
        <Link href="/analytics">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
        </Link>
      </PageHeader>

      {/* Ranking Banner */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-border/50 hover:shadow-md transition-all">
        <CardContent className="p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
                <Medal className="h-7 w-7 text-white" />
              </div>
              <div>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Classement equipe</p>
                <p className="text-3xl font-bold text-foreground">
                  #{report.ranking.position}
                  <span className="text-lg text-muted-foreground font-normal">
                    {" "}
                    / {report.ranking.total}
                  </span>
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Base sur</p>
              <p className="text-lg font-medium text-foreground">
                {report.ranking.metric}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metrics Cards */}
      {report.metrics.length === 0 && (
        <Card className="mb-6 border-border/50">
          <CardContent className="p-8 text-center">
            <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
              <BarChart3 className="h-7 w-7 text-muted-foreground/50" />
            </div>
            <p className="text-muted-foreground font-medium">Aucune metrique disponible pour cette periode.</p>
          </CardContent>
        </Card>
      )}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {report.metrics.map((metric) => {
          const progressPct = Math.min(100, Math.round((metric.current / metric.target) * 100));
          const isPositiveTrend = (metric.trend ?? 0) >= 0;

          return (
            <Card key={metric.label} className="border-border/50 hover:shadow-md transition-all">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    {metric.label}
                  </span>
                  {metric.trend != null && metric.trend !== 0 && (
                    <Badge
                      variant="outline"
                      className={
                        isPositiveTrend
                          ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                          : "bg-red-500/10 text-red-500 border-red-500/30"
                      }
                    >
                      {isPositiveTrend ? (
                        <TrendingUp className="h-3 w-3 mr-1" />
                      ) : (
                        <TrendingDown className="h-3 w-3 mr-1" />
                      )}
                      {isPositiveTrend ? "+" : ""}
                      {metric.trend}%
                    </Badge>
                  )}
                </div>
                <p className="text-2xl font-bold mb-1">
                  {metric.unit === "€"
                    ? formatCurrency(metric.current)
                    : `${metric.current}${metric.unit}`}
                </p>
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                  <span>Objectif: {metric.unit === "€" ? formatCurrency(metric.target) : `${metric.target}${metric.unit}`}</span>
                  <span
                    className={
                      progressPct >= 100
                        ? "text-emerald-500"
                        : progressPct >= 70
                        ? "text-[#7af17a]"
                        : "text-orange-400"
                    }
                  >
                    {progressPct}%
                  </span>
                </div>
                <Progress
                  value={progressPct}
                  className="h-2"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Mois dernier:{" "}
                  {metric.unit === "€"
                    ? formatCurrency(metric.previous)
                    : `${metric.previous}${metric.unit}`}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Weekly Revenue Chart */}
        <Card className="border-border/50 hover:shadow-md transition-all">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-emerald-500" />
              Evolution hebdomadaire
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              {report.weeklyData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={report.weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="week" stroke="#888" />
                    <YAxis stroke="#888" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#14080e",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "8px",
                      }}
                      formatter={(value) =>
                        formatCurrency(Number(value) || 0)
                      }
                    />
                    <Bar
                      dataKey="revenue"
                      name="CA"
                      fill="#7af17a"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-3">
                    <BarChart3 className="h-7 w-7 opacity-50" />
                  </div>
                  <p className="text-sm">Aucune donnee disponible</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Goal Progress Radial */}
        <Card className="border-border/50 hover:shadow-md transition-all">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-500" />
              Progression objectifs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              {radialData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart
                    cx="50%"
                    cy="50%"
                    innerRadius="20%"
                    outerRadius="90%"
                    data={radialData}
                    startAngle={180}
                    endAngle={0}
                  >
                    <RadialBar
                      background={{ fill: "#222" }}
                      dataKey="value"
                      cornerRadius={4}
                    />
                    <Legend
                      iconSize={10}
                      layout="vertical"
                      verticalAlign="middle"
                      align="right"
                      wrapperStyle={{ fontSize: "12px" }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#14080e",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "8px",
                      }}
                      formatter={(value) => `${value}%`}
                    />
                  </RadialBarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-3">
                    <BarChart3 className="h-7 w-7 opacity-50" />
                  </div>
                  <p className="text-sm">Aucune donnee disponible</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Objectives Progress */}
      <Card className="border-border/50 hover:shadow-md transition-all">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              Suivi des objectifs SMART
            </CardTitle>
            <Link href="/team/coaching">
              <Button variant="outline" size="sm">
                Gerer les objectifs
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {report.objectivesProgress.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                <Target className="h-7 w-7 opacity-50" />
              </div>
              <p className="font-medium">Aucun objectif actif</p>
              <p className="text-sm mt-1">
                Definissez vos objectifs pour suivre votre progression
              </p>
              <Link href="/team/coaching">
                <Button className="mt-4">Creer un objectif</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {report.objectivesProgress.map((obj) => {
                const statusCfg = STATUS_CONFIG[obj.status] || STATUS_CONFIG.in_progress;
                const StatusIcon = statusCfg.icon;

                return (
                  <div
                    key={obj.id}
                    className="p-4 rounded-lg bg-muted/30 border border-border/50 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-medium">{obj.title}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {obj.category}
                          </Badge>
                          <Badge variant="outline" className={statusCfg.color}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {obj.status === "in_progress"
                              ? "En cours"
                              : obj.status === "at_risk"
                              ? "A risque"
                              : "En retard"}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>
                            {obj.daysLeft > 0
                              ? `${obj.daysLeft} jour${obj.daysLeft > 1 ? "s" : ""} restant${obj.daysLeft > 1 ? "s" : ""}`
                              : "Echeance depassee"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Progress value={obj.progress} className="flex-1 h-2" />
                      <span
                        className={`text-sm font-medium ${
                          obj.progress >= 100
                            ? "text-emerald-500"
                            : obj.progress >= 70
                            ? "text-[#7af17a]"
                            : "text-orange-400"
                        }`}
                      >
                        {obj.progress}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
