"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/layout/page-header";
import {
  Phone,
  CalendarCheck,
  Target,
  TrendingUp,
  Trophy,
  Flame,
  MessageCircle,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { GAMIFICATION_LEVELS } from "@/lib/constants";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

interface SetterDashboardData {
  stats: {
    bookings: number;
    showUpRate: number;
    closingRate: number;
    revenue: number;
    activeConversations: number;
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
}

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

  const statCards = [
    {
      title: "Appels bookes",
      value: data.stats.bookings.toString(),
      icon: Phone,
    },
    {
      title: "Taux show-up",
      value: `${data.stats.showUpRate}%`,
      icon: CalendarCheck,
    },
    {
      title: "Taux closing",
      value: `${data.stats.closingRate}%`,
      icon: Target,
    },
    {
      title: "CA genere",
      value: formatCurrency(data.stats.revenue),
      icon: TrendingUp,
    },
    {
      title: "Conversations actives",
      value: data.stats.activeConversations.toString(),
      icon: MessageCircle,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Mon Dashboard"
        description="Tes stats et prochains calls"
      />

      {/* Gamification banner */}
      <Card className="mb-6 bg-brand-dark text-white border-0">
        <CardContent className="p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-brand/20 flex items-center justify-center">
                <Trophy className="h-6 w-6 text-brand" />
              </div>
              <div>
                <p className="text-sm text-white/70">Niveau actuel</p>
                <p className="text-xl font-bold">
                  {data.gamification.levelName}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-sm text-white/70">Streak</p>
                <div className="flex items-center gap-1">
                  <Flame className="h-4 w-4 text-orange-400" />
                  <span className="text-lg font-bold">
                    {data.gamification.streakDays} jour
                    {data.gamification.streakDays > 1 ? "s" : ""}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-white/70">Points</p>
                <p className="text-lg font-bold text-brand">
                  {data.gamification.points}
                </p>
              </div>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-xs text-white/50 mb-1">
              <span>{currentLevel.name}</span>
              {!isMaxLevel && (
                <span>
                  {nextLevel.name} ({nextLevel.min_points} pts)
                </span>
              )}
            </div>
            <Progress
              value={Math.min(progressToNext, 100)}
              className="h-2 bg-white/10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="h-4 w-4 text-brand" />
                  <span className="text-xs text-muted-foreground">
                    {stat.title}
                  </span>
                </div>
                <p className="text-xl font-bold">{stat.value}</p>
              </CardContent>
            </Card>
          );
        })}
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
