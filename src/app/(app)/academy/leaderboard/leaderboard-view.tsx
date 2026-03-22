"use client";

import Link from "next/link";
import { ArrowLeft, Trophy, Medal, Award } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface LeaderboardEntry {
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  role: string;
  totalAttempts: number;
  passedAttempts: number;
  successRate: number;
  avgScore: number;
}

interface LeaderboardViewProps {
  leaderboard: LeaderboardEntry[];
}

const RANK_STYLES: Record<
  number,
  { icon: typeof Trophy; color: string; bg: string }
> = {
  0: {
    icon: Trophy,
    color: "text-yellow-400",
    bg: "bg-yellow-400/10 border-yellow-400/30",
  },
  1: {
    icon: Medal,
    color: "text-gray-300",
    bg: "bg-gray-300/10 border-gray-300/30",
  },
  2: {
    icon: Award,
    color: "text-amber-600",
    bg: "bg-amber-600/10 border-amber-600/30",
  },
};

export function LeaderboardView({ leaderboard }: LeaderboardViewProps) {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="space-y-3">
        <Link
          href="/academy"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour a l&apos;Academy
        </Link>
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-emerald-500/10 p-2.5">
            <Trophy className="h-6 w-6 text-emerald-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Classement Academy</h1>
            <p className="text-sm text-muted-foreground">
              Top 7 — Taux de reussite aux quiz
            </p>
          </div>
        </div>
      </div>

      {/* Leaderboard */}
      {leaderboard.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Trophy className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-muted-foreground">
              Aucune données disponible. Les résultats apparaîtront quand les
              setters auront passe des quiz.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top Performers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {leaderboard.map((entry, index) => {
              const rankStyle = RANK_STYLES[index];
              const RankIcon = rankStyle?.icon;

              return (
                <div
                  key={entry.userId}
                  className={cn(
                    "flex items-center gap-4 rounded-lg border p-4 transition-colors",
                    rankStyle?.bg || "bg-muted/20",
                  )}
                >
                  {/* Rang */}
                  <div className="shrink-0 w-10 text-center">
                    {RankIcon ? (
                      <RankIcon
                        className={cn("h-6 w-6 mx-auto", rankStyle.color)}
                      />
                    ) : (
                      <span className="text-lg font-bold text-muted-foreground">
                        {index + 1}
                      </span>
                    )}
                  </div>

                  {/* Avatar */}
                  <div className="shrink-0">
                    {entry.avatarUrl ? (
                      <img
                        src={entry.avatarUrl}
                        alt={entry.fullName}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-semibold">
                        {entry.fullName
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Infos */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{entry.fullName}</p>
                    <p className="text-xs text-muted-foreground">
                      {entry.passedAttempts}/{entry.totalAttempts} quiz reussis
                      &middot; Score moyen {entry.avgScore}%
                    </p>
                  </div>

                  {/* Taux de reussite */}
                  <div className="shrink-0 text-right">
                    <Badge
                      variant={
                        entry.successRate >= 80 ? "default" : "secondary"
                      }
                      className={cn(
                        "text-base font-bold px-3 py-1",
                        entry.successRate >= 80 && "bg-emerald-500 text-black",
                      )}
                    >
                      {entry.successRate}%
                    </Badge>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
