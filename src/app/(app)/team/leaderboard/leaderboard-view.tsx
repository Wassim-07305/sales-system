"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Medal, Crown, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface LeaderboardEntry {
  user_id: string;
  level: number;
  level_name: string;
  total_points: number;
  current_streak: number;
  user: { full_name: string | null; avatar_url: string | null; role: string } | null;
}

interface Props {
  leaderboard: LeaderboardEntry[];
  currentUserId: string;
}

export function LeaderboardView({ leaderboard, currentUserId }: Props) {
  const top3 = leaderboard.slice(0, 3);

  const rankIcons = [
    <Crown key="1" className="h-8 w-8 text-yellow-500" />,
    <Medal key="2" className="h-7 w-7 text-gray-400" />,
    <Medal key="3" className="h-6 w-6 text-orange-400" />,
  ];

  return (
    <div>
      <PageHeader
        title="Leaderboard"
        description="Le classement de la communauté Sales System"
      >
        <Link href="/team">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Équipe
          </Button>
        </Link>
      </PageHeader>

      {/* Empty state */}
      {leaderboard.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Crown className="h-10 w-10 mx-auto text-yellow-500/30 mb-3" />
            <p className="font-medium text-lg">Aucun classement disponible</p>
            <p className="text-sm text-muted-foreground mt-1">
              Le leaderboard se remplira automatiquement lorsque les membres de l&apos;equipe accumuleront des points.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Top 3 podium */}
      {top3.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[1, 0, 2].map((podiumIndex) => {
            const player = top3[podiumIndex];
            if (!player) return <div key={podiumIndex} />;
            const rank = podiumIndex + 1;
            const isMe = player.user_id === currentUserId;
            return (
              <Card
                key={player.user_id}
                className={`text-center ${rank === 1 ? "ring-2 ring-yellow-500/50 -mt-4" : ""} ${isMe ? "bg-brand/5" : ""}`}
              >
                <CardContent className="p-6">
                  <div className="flex justify-center mb-3">{rankIcons[podiumIndex]}</div>
                  <div className={`h-16 w-16 rounded-full mx-auto mb-3 flex items-center justify-center text-xl font-bold ${
                    rank === 1 ? "bg-yellow-100 text-yellow-700" :
                    rank === 2 ? "bg-gray-100 text-gray-700" :
                    "bg-orange-100 text-orange-700"
                  }`}>
                    {player.user?.full_name?.charAt(0) || "?"}
                  </div>
                  <p className="font-semibold text-sm truncate">
                    {player.user?.full_name || "Anonyme"}
                  </p>
                  <Badge variant="outline" className="text-xs mt-1 mb-2">{player.level_name}</Badge>
                  <p className="text-2xl font-bold text-brand">{player.total_points}</p>
                  <p className="text-xs text-muted-foreground">points</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Full table */}
      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            {leaderboard.map((player, i) => {
              const rank = i + 1;
              const isMe = player.user_id === currentUserId;
              return (
                <div
                  key={player.user_id}
                  className={`flex items-center gap-4 px-4 py-3 ${isMe ? "bg-brand/5" : ""}`}
                >
                  <span className={`text-sm font-bold w-8 text-center ${
                    rank === 1 ? "text-yellow-500" :
                    rank === 2 ? "text-gray-400" :
                    rank === 3 ? "text-orange-400" :
                    "text-muted-foreground"
                  }`}>
                    #{rank}
                  </span>
                  <div className="h-9 w-9 rounded-full bg-brand/10 flex items-center justify-center text-brand text-sm font-bold shrink-0">
                    {player.user?.full_name?.charAt(0) || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {player.user?.full_name || "Anonyme"} {isMe && <span className="text-brand">(vous)</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">{player.level_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">{player.total_points} pts</p>
                    {player.current_streak > 0 && (
                      <p className="text-xs text-orange-400">{player.current_streak}j streak</p>
                    )}
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
