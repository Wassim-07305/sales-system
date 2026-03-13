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
        <Card className="bg-primary text-primary-foreground border-0">
          <CardContent className="p-5">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-brand/20 flex items-center justify-center">
                  <Trophy className="h-6 w-6 text-brand" />
                </div>
                <div>
                  <p className="text-sm text-primary-foreground/70">Niveau actuel</p>
                  <p className="text-xl font-bold">
                    {data.gamification.levelName}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-sm text-primary-foreground/70">Streak</p>
                  <div className="flex items-center gap-1">
                    <Flame className="h-4 w-4 text-orange-400" />
                    <span className="text-lg font-bold">
                      {data.gamification.streakDays} jour
                      {data.gamification.streakDays > 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-primary-foreground/70">Points</p>
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
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Phone className="h-4 w-4 text-brand" />
              <span className="text-xs text-muted-foreground">
                Appels bookes
              </span>
            </div>
            <p className="text-xl font-bold">{data.stats.bookings}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <CalendarCheck className="h-4 w-4 text-brand" />
              <span className="text-xs text-muted-foreground">
                Taux show-up
              </span>
            </div>
            <p className="text-xl font-bold">{data.stats.showUpRate}%</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-brand" />
              <span className="text-xs text-muted-foreground">
                Taux closing
              </span>
            </div>
            <p className="text-xl font-bold">{data.stats.closingRate}%</p>
            <p className="text-xs text-muted-foreground">
              {data.stats.dealsClosed}/{data.stats.dealsTotal} deals
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              {data.stats.revenueTrend >= 0 ? (
                <TrendingUp className="h-4 w-4 text-brand" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-400" />
              )}
              <span className="text-xs text-muted-foreground">CA genere</span>
            </div>
            <p className="text-xl font-bold">
              {formatCurrency(data.stats.revenue)}
            </p>
            {data.stats.revenueTrend !== 0 && (
              <p
                className={`text-xs ${
                  data.stats.revenueTrend >= 0
                    ? "text-emerald-500"
                    : "text-red-400"
                }`}
              >
                {data.stats.revenueTrend >= 0 ? "+" : ""}
                {data.stats.revenueTrend}% vs mois dernier
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <MessageCircle className="h-4 w-4 text-brand" />
              <span className="text-xs text-muted-foreground">
                Conversations
              </span>
            </div>
            <p className="text-xl font-bold">
              {data.stats.activeConversations}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Chart + Objectives Row */}
      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Weekly Performance Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-brand" />
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
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="h-5 w-5 text-brand" />
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
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Prochains appels</CardTitle>
        </CardHeader>
        <CardContent>
          {data.upcomingCalls.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucun appel prevu pour le moment.
            </p>
          ) : (
            <div className="space-y-3">
              {data.upcomingCalls.map((call) => (
                <div
                  key={call.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-brand/10 flex items-center justify-center text-brand text-xs font-bold">
                      {call.name?.charAt(0) || "?"}
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {call.name || "Inconnu"}
                      </p>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {call.type}
                      </Badge>
                    </div>
                  </div>
                  <span className="text-sm font-medium">
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
