"use client";

import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Trophy,
  Flame,
  Star,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface AnalyticsData {
  totalUsers: number;
  avgPoints: number;
  avgStreak: number;
  totalChallengesCompleted: number;
  mostPopularBadge: {
    id: string;
    name: string;
    earned: number;
    rate: number;
  } | null;
  pointsDistribution: Array<{ range: string; count: number }>;
  badgeCompletionRates: Array<{
    id: string;
    name: string;
    icon: string;
    color: string;
    category: string;
    earned: number;
    total: number;
    rate: number;
  }>;
  levelDistribution: Array<{ level: number; name: string; count: number }>;
  challengeStats: Array<{
    id: string;
    title: string;
    isActive: boolean;
    participants: number;
    completed: number;
    rate: number;
  }>;
  moodTrend: Array<{ date: string; mood: number }>;
  impact: {
    active: { count: number; avgDeals: number; avgRevenue: number };
    others: { count: number; avgDeals: number; avgRevenue: number };
  };
}

interface Props {
  data: AnalyticsData;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function GamificationAnalyticsView({ data }: Props) {
  const moodChartData = data.moodTrend.map((m) => ({
    ...m,
    label: format(new Date(m.date), "d MMM", { locale: fr }),
  }));

  return (
    <div>
      <PageHeader
        title="Analytics Gamification"
        description="Impact et statistiques du programme de gamification"
      >
        <Link href="/challenges">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour aux défis
          </Button>
        </Link>
      </PageHeader>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="rounded-2xl border-border/40 hover:shadow-lg hover:shadow-brand/5 transition-all duration-300">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <Star className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{data.avgPoints}</p>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Pts moyens
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-border/40 hover:shadow-lg hover:shadow-brand/5 transition-all duration-300">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <Flame className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{data.avgStreak}</p>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Streak moyen
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-border/40 hover:shadow-lg hover:shadow-brand/5 transition-all duration-300">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Trophy className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {data.totalChallengesCompleted}
                </p>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Defis completes
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-border/40 hover:shadow-lg hover:shadow-brand/5 transition-all duration-300">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
                <Zap className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                <p className="text-2xl font-bold truncate">
                  {data.mostPopularBadge?.name || "—"}
                </p>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Badge populaire
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Level distribution + Mood trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Level distribution bar chart */}
        <Card className="rounded-2xl border-border/40 hover:shadow-lg hover:shadow-brand/5 transition-all duration-300">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-600" />
              Repartition par niveau
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.levelDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: "#999" }}
                    angle={-20}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: "#999" }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1c1c1c",
                      border: "1px solid #333",
                      borderRadius: 8,
                      fontSize: 13,
                    }}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    formatter={
                      ((value: any) => [
                        `${value} utilisateurs`,
                        "Nombre",
                      ]) as any
                    }
                  />
                  <Bar dataKey="count" fill="#7af17a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Mood trend line chart */}
        <Card className="rounded-2xl border-border/40 hover:shadow-lg hover:shadow-brand/5 transition-all duration-300">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-amber-600" />
              Tendance humeur (30 jours)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[260px]">
              {moodChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={moodChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: "#999" }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      domain={[1, 5]}
                      tick={{ fontSize: 12, fill: "#999" }}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1c1c1c",
                        border: "1px solid #333",
                        borderRadius: 8,
                        fontSize: 13,
                      }}
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      formatter={
                        ((value: any) => [`${value}/5`, "Humeur"]) as any
                      }
                    />
                    <Line
                      type="monotone"
                      dataKey="mood"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      dot={{ fill: "#f59e0b", r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-sm gap-3">
                  <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-muted-foreground/60" />
                  </div>
                  Aucune donnee d&apos;humeur disponible
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Badge completion grid */}
      <Card className="mb-6 rounded-2xl border-border/40 hover:shadow-lg hover:shadow-brand/5 transition-all duration-300">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Star className="h-4 w-4 text-emerald-600" />
            Taux d&apos;obtention des badges
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.badgeCompletionRates.map((badge) => (
              <div
                key={badge.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border rounded-2xl border-border/40 hover:shadow-lg hover:shadow-brand/5 transition-all duration-300"
              >
                <div
                  className="h-9 w-9 rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${badge.color}20` }}
                >
                  <span className="text-lg" style={{ color: badge.color }}>
                    {badge.icon === "Handshake"
                      ? "🤝"
                      : badge.icon === "Flame"
                        ? "🔥"
                        : badge.icon === "Phone"
                          ? "📞"
                          : badge.icon === "PhoneCall"
                            ? "📱"
                            : badge.icon === "Star"
                              ? "⭐"
                              : badge.icon === "Target"
                                ? "🎯"
                                : badge.icon === "Users"
                                  ? "👥"
                                  : badge.icon === "Zap"
                                    ? "⚡"
                                    : badge.icon === "Crown"
                                      ? "👑"
                                      : "🏅"}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium truncate">{badge.name}</p>
                    <span className="text-xs text-muted-foreground ml-2 shrink-0">
                      {badge.earned}/{badge.total}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={badge.rate} className="h-1.5 flex-1" />
                    <span className="text-xs font-medium w-8 text-right">
                      {badge.rate}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Challenge completion rates */}
      {data.challengeStats.length > 0 && (
        <Card className="mb-6 rounded-2xl border-border/40 hover:shadow-lg hover:shadow-brand/5 transition-all duration-300">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="h-4 w-4 text-blue-600" />
              Taux de completion des defis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.challengeStats.map((ch) => (
                <div key={ch.id} className="flex items-center gap-3">
                  <Badge
                    variant="outline"
                    className={cn(
                      "shrink-0",
                      ch.isActive
                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                        : "bg-zinc-500/10 text-zinc-600 border-zinc-500/20",
                    )}
                  >
                    {ch.isActive ? "Actif" : "Termine"}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium truncate">{ch.title}</p>
                      <span className="text-xs text-muted-foreground ml-2 shrink-0">
                        {ch.completed}/{ch.participants} participants
                      </span>
                    </div>
                    <Progress value={ch.rate} className="h-1.5" />
                  </div>
                  <span className="text-xs font-medium w-8 text-right shrink-0">
                    {ch.rate}%
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Impact section */}
      <Card className="rounded-2xl border-border/40 hover:shadow-lg hover:shadow-brand/5 transition-all duration-300">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-600" />
            Impact de la gamification sur les ventes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Comparaison des performances entre les joueurs actifs (streak de 7
            jours ou plus) et les autres membres de l&apos;equipe.
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Groupe</TableHead>
                <TableHead className="text-center">Membres</TableHead>
                <TableHead className="text-center">Deals moyens</TableHead>
                <TableHead className="text-right">Revenu moyen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-[#7af17a]" />
                    <span className="font-medium">
                      Joueurs actifs (streak 7+)
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  {data.impact.active.count}
                </TableCell>
                <TableCell className="text-center font-medium">
                  {data.impact.active.avgDeals}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(data.impact.active.avgRevenue)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-muted-foreground" />
                    <span className="font-medium">Autres</span>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  {data.impact.others.count}
                </TableCell>
                <TableCell className="text-center font-medium">
                  {data.impact.others.avgDeals}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(data.impact.others.avgRevenue)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
          {data.impact.active.count > 0 && data.impact.others.count > 0 && (
            <div className="mt-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <p className="text-sm">
                {data.impact.active.avgRevenue >
                data.impact.others.avgRevenue ? (
                  <>
                    Les joueurs actifs generent en moyenne{" "}
                    <span className="font-semibold text-[#7af17a]">
                      {data.impact.others.avgRevenue > 0
                        ? `${Math.round(
                            ((data.impact.active.avgRevenue -
                              data.impact.others.avgRevenue) /
                              data.impact.others.avgRevenue) *
                              100,
                          )}% de plus`
                        : formatCurrency(data.impact.active.avgRevenue)}
                    </span>{" "}
                    de revenu que les autres membres.
                  </>
                ) : (
                  <>
                    Pas encore assez de donnees pour identifier un ecart
                    significatif entre les groupes.
                  </>
                )}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
