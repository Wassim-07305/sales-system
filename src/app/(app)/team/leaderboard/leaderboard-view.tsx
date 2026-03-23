"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Medal, Crown, ArrowLeft, Flame, Trophy, Zap, ArrowUp, ArrowDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface LeaderboardEntry {
  user_id: string;
  level: number;
  level_name: string;
  total_points: number;
  current_streak: number;
  previous_rank?: number | null;
  user: {
    full_name: string | null;
    avatar_url: string | null;
    role: string;
  } | null;
}

interface Props {
  leaderboard: LeaderboardEntry[];
  currentUserId: string;
}

const PODIUM_CONFIG = [
  {
    ring: "ring-amber-400/50",
    bg: "bg-gradient-to-br from-amber-400 to-amber-600",
    textColor: "text-amber-500",
    size: "h-20 w-20",
    icon: Crown,
    iconSize: "h-8 w-8",
  },
  {
    ring: "ring-slate-300/50",
    bg: "bg-gradient-to-br from-slate-300 to-slate-500",
    textColor: "text-slate-400",
    size: "h-16 w-16",
    icon: Medal,
    iconSize: "h-7 w-7",
  },
  {
    ring: "ring-orange-400/50",
    bg: "bg-gradient-to-br from-orange-300 to-orange-500",
    textColor: "text-orange-400",
    size: "h-16 w-16",
    icon: Medal,
    iconSize: "h-6 w-6",
  },
];

const AVATAR_COLORS = [
  "bg-blue-600",
  "bg-emerald-600",
  "bg-amber-600",
  "bg-purple-600",
  "bg-pink-600",
  "bg-cyan-600",
  "bg-rose-600",
  "bg-indigo-600",
];

function getAvatarColor(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++)
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function RankChange({ currentRank, previousRank }: { currentRank: number; previousRank?: number | null }) {
  if (previousRank == null) return null;
  const diff = previousRank - currentRank;
  if (diff > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-500">
        <ArrowUp className="h-3 w-3" />
        {diff}
      </span>
    );
  }
  if (diff < 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-red-500">
        <ArrowDown className="h-3 w-3" />
        {Math.abs(diff)}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center text-[10px] text-muted-foreground">
      <Minus className="h-3 w-3" />
    </span>
  );
}

export function LeaderboardView({ leaderboard, currentUserId }: Props) {
  const top3 = leaderboard.slice(0, 3);

  return (
    <div>
      <PageHeader
        title="Leaderboard"
        description="Le classement de la communauté Sales System"
      >
        <Link href="/team">
          <Button variant="outline" size="sm" className="h-8 gap-1.5">
            <ArrowLeft className="h-3.5 w-3.5" />
            Équipe
          </Button>
        </Link>
      </PageHeader>

      {/* Empty state */}
      {leaderboard.length === 0 && (
        <Card className="border-border/50 bg-muted/10">
          <CardContent className="py-16 text-center">
            <div className="h-16 w-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
              <Trophy className="h-7 w-7 text-amber-500" />
            </div>
            <p className="font-semibold text-lg">Aucun classement disponible</p>
            <p className="text-sm text-muted-foreground mt-1.5 max-w-sm mx-auto">
              Le leaderboard se remplira automatiquement lorsque les membres
              accumuleront des points.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Top 3 podium */}
      {top3.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[1, 0, 2].map((podiumIndex) => {
            const player = top3[podiumIndex];
            if (!player) return <div key={podiumIndex} />;
            const rank = podiumIndex + 1;
            const isMe = player.user_id === currentUserId;
            const cfg = PODIUM_CONFIG[podiumIndex];
            const Icon = cfg.icon;
            return (
              <Card
                key={player.user_id}
                className={cn(
                  "text-center overflow-hidden transition-all hover:shadow-lg",
                  rank === 1 && "ring-2 ring-amber-400/30 -mt-4",
                  isMe && "bg-emerald-500/5 border-emerald-500/20",
                )}
              >
                <CardContent className="p-6 pt-5">
                  <div className="flex justify-center mb-3">
                    <div
                      className={cn(
                        "h-10 w-10 rounded-xl flex items-center justify-center",
                        `${cfg.bg}`,
                      )}
                    >
                      <Icon className={cn(cfg.iconSize, "text-white")} />
                    </div>
                  </div>
                  <div
                    className={cn(
                      "rounded-2xl mx-auto mb-3 flex items-center justify-center text-white font-bold ring-4 ring-background",
                      cfg.size,
                      getAvatarColor(player.user_id),
                    )}
                  >
                    <span className={rank === 1 ? "text-2xl" : "text-xl"}>
                      {player.user?.full_name
                        ?.split(" ")
                        .map((w) => w[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase() || "?"}
                    </span>
                  </div>
                  <p className="font-semibold text-sm truncate">
                    {player.user?.full_name || "Anonyme"}
                  </p>
                  <Badge
                    variant="outline"
                    className="text-[10px] mt-1.5 mb-3 font-medium"
                  >
                    {player.level_name}
                  </Badge>
                  <p
                    className={cn(
                      "text-3xl font-bold tracking-tight",
                      cfg.textColor,
                    )}
                  >
                    {player.total_points.toLocaleString("fr-FR")}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    points
                  </p>
                  {player.current_streak > 0 && (
                    <div className="flex items-center justify-center gap-1 mt-2">
                      <Flame className="h-3 w-3 text-orange-400" />
                      <span className="text-[11px] font-semibold text-orange-400">
                        {player.current_streak}j
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Full table */}
      <Card className="overflow-hidden">
        <style>{`
          @keyframes pulse-subtle {
            0%, 100% { background-color: transparent; }
            50% { background-color: rgb(16 185 129 / 0.08); }
          }
        `}</style>
        <CardContent className="p-0">
          <div className="divide-y divide-border/50">
            {leaderboard.map((player, i) => {
              const rank = i + 1;
              const isMe = player.user_id === currentUserId;
              return (
                <div
                  key={player.user_id}
                  className={cn(
                    "flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-muted/30",
                    isMe && "bg-emerald-500/5 animate-[pulse-subtle_3s_ease-in-out_1]",
                  )}
                >
                  <div className="flex flex-col items-center w-8 gap-0.5">
                    <span
                      className={cn(
                        "text-sm font-bold tabular-nums",
                        rank === 1
                          ? "text-amber-500"
                          : rank === 2
                            ? "text-slate-400"
                            : rank === 3
                              ? "text-orange-400"
                              : "text-muted-foreground/50",
                      )}
                    >
                      #{rank}
                    </span>
                    <RankChange currentRank={rank} previousRank={player.previous_rank} />
                  </div>
                  <div
                    className={cn(
                      "h-9 w-9 rounded-lg flex items-center justify-center text-white text-[11px] font-bold shrink-0",
                      getAvatarColor(player.user_id),
                    )}
                  >
                    {player.user?.full_name
                      ?.split(" ")
                      .map((w) => w[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase() || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {player.user?.full_name || "Anonyme"}
                      {isMe && (
                        <span className="text-emerald-500 ml-1.5 text-xs">
                          (vous)
                        </span>
                      )}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {player.level_name}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {player.current_streak > 0 && (
                      <div className="flex items-center gap-1">
                        <Zap className="h-3 w-3 text-orange-400" />
                        <span className="text-[11px] font-semibold text-orange-400 tabular-nums">
                          {player.current_streak}j
                        </span>
                      </div>
                    )}
                    <div className="text-right min-w-[70px]">
                      <p className="text-sm font-bold tabular-nums">
                        {player.total_points.toLocaleString("fr-FR")}
                      </p>
                      <p className="text-[10px] text-muted-foreground">pts</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
