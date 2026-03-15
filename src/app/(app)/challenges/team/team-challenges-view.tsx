"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Users,
  Trophy,
  Clock,
  Zap,
  ArrowLeft,
  Medal,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface Challenge {
  id: string;
  title: string;
  description: string | null;
  target_value: number;
  metric: string;
  points_reward: number;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  category: string | null;
  is_team: boolean;
}

interface Contribution {
  user_id: string;
  full_name: string | null;
  value: number;
}

interface ProgressEntry {
  total: number;
  contributions: Contribution[];
}

interface Props {
  challenges: Challenge[];
  progressMap: Record<string, ProgressEntry>;
}

export function TeamChallengesView({ challenges, progressMap }: Props) {
  return (
    <div>
      <PageHeader
        title="Défis d'Équipe"
        description="Relevez des défis en groupe"
      >
        <Link href="/challenges">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour aux défis
          </Button>
        </Link>
      </PageHeader>

      {challenges.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="p-12 text-center text-muted-foreground">
            <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
              <Users className="h-7 w-7 text-muted-foreground/60" />
            </div>
            <p className="font-medium text-lg mb-1">
              Aucun défi d&apos;équipe en cours
            </p>
            <p className="text-sm">
              Les défis d&apos;équipe apparaîtront ici quand ils seront
              disponibles.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {challenges.map((challenge) => {
              const prog = progressMap[challenge.id];
              const teamTotal = prog?.total || 0;
              const percent = Math.min(
                Math.round((teamTotal / challenge.target_value) * 100),
                100
              );
              const isCompleted = teamTotal >= challenge.target_value;

              return (
                <Card
                  key={challenge.id}
                  className={cn(
                    "rounded-2xl border-border/40 hover:shadow-lg hover:shadow-brand/5 transition-all duration-300",
                    isCompleted && "border-emerald-500/20 bg-emerald-500/10"
                  )}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                          <Users className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg mb-1">
                            {challenge.title}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {challenge.description}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-4">
                        {isCompleted && (
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                            <Trophy className="h-3 w-3 mr-1" />
                            Complété
                          </Badge>
                        )}
                        <Badge variant="outline" className="bg-violet-500/10 text-violet-600 border-violet-500/20">
                          <Zap className="h-3 w-3 mr-1" />
                          {challenge.points_reward} pts
                        </Badge>
                      </div>
                    </div>

                    {/* Team progress bar */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="font-medium">
                          {teamTotal} / {challenge.target_value}
                        </span>
                        <span className="text-muted-foreground">
                          {percent}%
                        </span>
                      </div>
                      <Progress
                        value={percent}
                        className="h-3 [&>div]:bg-brand"
                      />
                    </div>

                    {/* Deadline */}
                    {challenge.end_date && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-4">
                        <Clock className="h-3 w-3" />
                        <span>
                          Date limite :{" "}
                          {format(new Date(challenge.end_date), "d MMMM yyyy", {
                            locale: fr,
                          })}
                        </span>
                      </div>
                    )}

                    {/* Individual contributions */}
                    {prog?.contributions && prog.contributions.length > 0 && (
                      <div className="border-t pt-4">
                        <p className="text-[11px] font-medium text-muted-foreground mb-3 uppercase tracking-wider">
                          Contributions individuelles
                        </p>
                        <div className="space-y-2">
                          {prog.contributions
                            .sort((a, b) => b.value - a.value)
                            .map((c, i) => {
                              const contribPercent =
                                teamTotal > 0
                                  ? Math.round((c.value / teamTotal) * 100)
                                  : 0;
                              return (
                                <div
                                  key={c.user_id}
                                  className="flex items-center gap-3"
                                >
                                  <span
                                    className={`text-xs font-bold w-5 text-center ${
                                      i === 0
                                        ? "text-yellow-500"
                                        : i === 1
                                          ? "text-gray-400"
                                          : i === 2
                                            ? "text-orange-400"
                                            : "text-muted-foreground"
                                    }`}
                                  >
                                    {i + 1}
                                  </span>
                                  <div className="h-6 w-6 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600 text-[10px] font-bold">
                                    {c.full_name?.charAt(0) || "?"}
                                  </div>
                                  <span className="text-sm flex-1 truncate">
                                    {c.full_name || "Anonyme"}
                                  </span>
                                  <span className="text-sm font-medium">
                                    {c.value}
                                  </span>
                                  <span className="text-xs text-muted-foreground w-10 text-right">
                                    {contribPercent}%
                                  </span>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Team Leaderboard sidebar */}
          <Card className="h-fit rounded-2xl border-border/40 hover:shadow-lg hover:shadow-brand/5 transition-all duration-300">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Medal className="h-5 w-5 text-brand" />
                Classement Équipe
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(() => {
                  // Aggregate contributions across all challenges
                  const userTotals: Record<
                    string,
                    { full_name: string | null; total: number }
                  > = {};
                  for (const prog of Object.values(progressMap)) {
                    for (const c of prog.contributions) {
                      if (!userTotals[c.user_id]) {
                        userTotals[c.user_id] = {
                          full_name: c.full_name,
                          total: 0,
                        };
                      }
                      userTotals[c.user_id].total += c.value;
                    }
                  }
                  const sorted = Object.entries(userTotals)
                    .sort(([, a], [, b]) => b.total - a.total)
                    .slice(0, 10);

                  if (sorted.length === 0) {
                    return (
                      <div className="flex flex-col items-center text-center text-sm text-muted-foreground py-6">
                        <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-3">
                          <Medal className="h-6 w-6 text-muted-foreground/60" />
                        </div>
                        Pas encore de contributions
                      </div>
                    );
                  }

                  return sorted.map(([userId, data], i) => {
                    const rank = i + 1;
                    return (
                      <div
                        key={userId}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg transition-all",
                          rank <= 3 ? "bg-muted/50 border border-border/50" : ""
                        )}
                      >
                        <span
                          className={cn(
                            "text-lg font-bold w-6 text-center",
                            rank === 1
                              ? "text-amber-500"
                              : rank === 2
                                ? "text-gray-400"
                                : rank === 3
                                  ? "text-orange-400"
                                  : "text-muted-foreground"
                          )}
                        >
                          {rank}
                        </span>
                        <div className="h-8 w-8 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 text-xs font-bold">
                          {data.full_name?.charAt(0) || "?"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {data.full_name || "Anonyme"}
                          </p>
                        </div>
                        <span className="text-sm font-semibold">
                          {data.total}
                        </span>
                      </div>
                    );
                  });
                })()}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
