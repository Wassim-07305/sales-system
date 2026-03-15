"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Phone,
  CalendarCheck,
  Target,
  TrendingUp,
  TrendingDown,
  Trophy,
  Flame,
  MessageCircle,
  Send,
  MailCheck,
  CalendarPlus,
  ArrowRight,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { GAMIFICATION_LEVELS } from "@/lib/constants";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

interface Objective {
  id: string;
  title: string;
  category: string;
  targetValue: number;
  currentValue: number;
  targetDate: string;
  status: string;
  progress: number;
}

interface SetterDashboardData {
  stats: {
    bookings: number;
    showUpRate: number;
    closingRate: number;
    revenue: number;
    lastMonthRevenue: number;
    revenueTrend: number;
    activeConversations: number;
    dealsClosed: number;
    dealsTotal: number;
  };
  upcomingCalls: Array<{
    id: string;
    name: string;
    time: string;
    type: string;
  }>;
  gamification: {
    points: number;
    level: number;
    levelName: string;
    streakDays: number;
  };
  dailyQuota: {
    dmsSent: number;
    dmsTarget: number;
    repliesReceived: number;
    bookingsFromDms: number;
  };
  objectives: Objective[];
  dailyPerformance: Array<{
    day: string;
    deals: number;
    revenue: number;
  }>;
}

const CATEGORY_ICONS: Record<string, typeof Target> = {
  calls: Phone,
  deals: Target,
  revenue: TrendingUp,
  skills: Trophy,
  other: BarChart3,
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  in_progress: {
    label: "En cours",
    color: "bg-[#7af17a]/20 text-[#7af17a]",
    icon: TrendingUp,
  },
  at_risk: {
    label: "A risque",
    color: "bg-orange-500/20 text-orange-400",
    icon: AlertTriangle,
  },
  overdue: {
    label: "En retard",
    color: "bg-red-500/20 text-red-400",
    icon: Clock,
  },
};

function getNextLevel(currentLevel: number) {
  const next = GAMIFICATION_LEVELS.find((l) => l.level === currentLevel + 1);
  return next || GAMIFICATION_LEVELS[GAMIFICATION_LEVELS.length - 1];
}

function getCurrentLevel(level: number) {
  return (
    GAMIFICATION_LEVELS.find((l) => l.level === level) || GAMIFICATION_LEVELS[0]
  );
}

export function SetterDashboard({ data }: { data: SetterDashboardData }) {
  const currentLevel = getCurrentLevel(data.gamification.level);
  const nextLevel = getNextLevel(data.gamification.level);

  const isMaxLevel = currentLevel.level === nextLevel.level;
  const progressToNext = isMaxLevel
    ? 100
    : Math.round(
        ((data.gamification.points - currentLevel.min_points) /
          (nextLevel.min_points - currentLevel.min_points)) *
          100
      );

  const quotaProgress = Math.min(
    100,
    Math.round((data.dailyQuota.dmsSent / data.dailyQuota.dmsTarget) * 100)
  );

  return (
    <div>
      <PageHeader
        title="Mon Dashboard"
        description="Tes stats, objectifs et prochains calls"
      />

      {/* Gamification + Daily Quota Row */}
      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        {/* Gamification banner */}
        <Card className="bg-gradient-to-br from-brand/20 to-brand/5 border-brand/20">
          <CardContent className="p-5">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-brand/20 flex items-center justify-center">
                  <Trophy className="h-6 w-6 text-brand" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Niveau actuel</p>
                  <p className="text-xl font-bold">
                    {data.gamification.levelName}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Streak</p>
                  <div className="flex items-center gap-1">
                    <Flame className="h-4 w-4 text-orange-400" />
                    <span className="text-lg font-bold">
                      {data.gamification.streakDays} jour
                      {data.gamification.streakDays > 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Points</p>
                  <p className="text-lg font-bold text-brand">
                    {data.gamification.points}
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>{currentLevel.name}</span>
                {!isMaxLevel && (
                  <span>
                    {nextLevel.name} ({nextLevel.min_points} pts)
                  </span>
                )}
              </div>
              <Progress
                value={Math.min(progressToNext, 100)}
                className="h-2 bg-muted"
              />
            </div>
          </CardContent>
        </Card>

        {/* Daily Quota Card */}
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-border">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Send className="h-5 w-5 text-[#7af17a]" />
                <h3 className="font-semibold text-foreground">Quota du jour</h3>
              </div>
              <Badge
                variant="outline"
                className={
                  quotaProgress >= 100
                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                    : quotaProgress >= 70
                    ? "bg-[#7af17a]/20 text-[#7af17a] border-[#7af17a]/30"
                    : "bg-orange-500/20 text-orange-400 border-orange-500/30"
                }
              >
                {quotaProgress}%
              </Badge>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">DMs envoyes</span>
                <span className="font-medium text-foreground">
                  {data.dailyQuota.dmsSent} / {data.dailyQuota.dmsTarget}
                </span>
              </div>
              <Progress value={quotaProgress} className="h-2 bg-muted" />
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="flex items-center gap-2">
                  <MailCheck className="h-4 w-4 text-blue-400" />
                  <div>
                    <p className="text-lg font-bold text-foreground">
                      {data.dailyQuota.repliesReceived}
                    </p>
                    <p className="text-xs text-muted-foreground">Reponses</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <CalendarPlus className="h-4 w-4 text-purple-400" />
                  <div>
                    <p className="text-lg font-bold text-foreground">
                      {data.dailyQuota.bookingsFromDms}
                    </p>
                    <p className="text-xs text-muted-foreground">Bookings</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <Card className="border-border/50 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
          <CardContent className="p-5">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="h-9 w-9 rounded-xl bg-brand/10 flex items-center justify-center ring-1 ring-brand/20">
                <Phone className="h-4 w-4 text-brand" />
              </div>
            </div>
            <p className="text-2xl font-bold tracking-tight">{data.stats.bookings}</p>
            <p className="text-[11px] font-medium text-muted-foreground mt-1 uppercase tracking-wider">
              Appels bookes
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
          <CardContent className="p-5">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="h-9 w-9 rounded-xl bg-blue-500/10 flex items-center justify-center ring-1 ring-blue-500/20">
                <CalendarCheck className="h-4 w-4 text-blue-500" />
              </div>
            </div>
            <p className="text-2xl font-bold tracking-tight">{data.stats.showUpRate}%</p>
            <p className="text-[11px] font-medium text-muted-foreground mt-1 uppercase tracking-wider">
              Taux show-up
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
          <CardContent className="p-5">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="h-9 w-9 rounded-xl bg-purple-500/10 flex items-center justify-center ring-1 ring-purple-500/20">
                <Target className="h-4 w-4 text-purple-500" />
              </div>
            </div>
            <p className="text-2xl font-bold tracking-tight">{data.stats.closingRate}%</p>
            <p className="text-[11px] font-medium text-muted-foreground mt-1 uppercase tracking-wider">
              Taux closing
            </p>
            <p className="text-xs text-muted-foreground/70 mt-0.5">
              {data.stats.dealsClosed}/{data.stats.dealsTotal} deals
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="h-9 w-9 rounded-xl bg-emerald-500/10 flex items-center justify-center ring-1 ring-emerald-500/20">
                {data.stats.revenueTrend >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-400" />
                )}
              </div>
              {data.stats.revenueTrend !== 0 && (
                <span
                  className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-md ${
                    data.stats.revenueTrend >= 0
                      ? "text-emerald-600 bg-emerald-500/10"
                      : "text-red-500 bg-red-500/10"
                  }`}
                >
                  {data.stats.revenueTrend >= 0 ? "+" : ""}
                  {data.stats.revenueTrend}%
                </span>
              )}
            </div>
            <p className="text-2xl font-bold tracking-tight">
              {formatCurrency(data.stats.revenue)}
            </p>
            <p className="text-[11px] font-medium text-muted-foreground mt-1 uppercase tracking-wider">CA genere</p>
          </CardContent>
        </Card>

        <Card className="border-border/50 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
          <CardContent className="p-5">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="h-9 w-9 rounded-xl bg-amber-500/10 flex items-center justify-center ring-1 ring-amber-500/20">
                <MessageCircle className="h-4 w-4 text-amber-500" />
              </div>
            </div>
            <p className="text-2xl font-bold tracking-tight">
              {data.stats.activeConversations}
            </p>
            <p className="text-[11px] font-medium text-muted-foreground mt-1 uppercase tracking-wider">
              Conversations
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Chart + Objectives Row */}
      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Weekly Performance Chart */}
        <Card className="border-border/50 hover:shadow-md transition-all">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-brand/10 flex items-center justify-center ring-1 ring-brand/20">
                <BarChart3 className="h-3.5 w-3.5 text-brand" />
              </div>
              Performance 7 jours
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              {data.dailyPerformance.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.dailyPerformance}>
                    <defs>
                      <linearGradient id="colorDeals" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#7af17a" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#7af17a" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="day"
                      tick={{ fill: "#888", fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fill: "#888", fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#14080e",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "8px",
                      }}
                      labelStyle={{ color: "#fff" }}
                    />
                    <Area
                      type="monotone"
                      dataKey="deals"
                      name="Deals"
                      stroke="#7af17a"
                      fill="url(#colorDeals)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  Aucune donnee disponible
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Active Objectives */}
        <Card className="border-border/50 hover:shadow-md transition-all">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-brand/10 flex items-center justify-center ring-1 ring-brand/20">
                  <Target className="h-3.5 w-3.5 text-brand" />
                </div>
                Mes objectifs
              </CardTitle>
              <Link href="/team/coaching">
                <Button variant="ghost" size="sm" className="text-brand">
                  Voir tout
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {data.objectives.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Target className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Aucun objectif actif</p>
                <Link href="/team/coaching">
                  <Button variant="outline" size="sm" className="mt-3">
                    Creer un objectif
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {data.objectives.map((obj) => {
                  const statusCfg = STATUS_CONFIG[obj.status] || STATUS_CONFIG.in_progress;
                  const CatIcon = CATEGORY_ICONS[obj.category] || Target;
                  return (
                    <div
                      key={obj.id}
                      className="p-3 rounded-lg bg-muted/30 border border-border"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <CatIcon className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium truncate max-w-[180px]">
                            {obj.title}
                          </span>
                        </div>
                        <Badge variant="outline" className={statusCfg.color}>
                          {statusCfg.label}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                        <span>
                          {obj.currentValue} / {obj.targetValue}
                        </span>
                        <span>{obj.progress}%</span>
                      </div>
                      <Progress value={obj.progress} className="h-1.5" />
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upcoming calls */}
      <Card className="border-border/50 hover:shadow-md transition-all">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-brand/10 flex items-center justify-center ring-1 ring-brand/20">
              <Phone className="h-3.5 w-3.5 text-brand" />
            </div>
            Prochains appels
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {data.upcomingCalls.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="h-12 w-12 rounded-2xl bg-muted/50 flex items-center justify-center mb-3">
                <Phone className="h-6 w-6 text-muted-foreground/40" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">Aucun appel prevu</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Les prochains appels apparaitront ici</p>
            </div>
          ) : (
            <div className="space-y-1">
              {data.upcomingCalls.map((call) => (
                <div
                  key={call.id}
                  className="flex items-center justify-between py-2.5 px-3 -mx-3 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-brand/10 flex items-center justify-center text-brand text-xs font-bold ring-1 ring-brand/20">
                      {call.name?.charAt(0) || "?"}
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {call.name || "Inconnu"}
                      </p>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 mt-0.5">
                        {call.type}
                      </Badge>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">
                    {format(new Date(call.time), "EEE dd MMM HH:mm", {
                      locale: fr,
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
