"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Trophy, Flame, Target, Clock, Medal, Star, Zap, CheckCircle2, BarChart3, Gift } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { LevelUpModal } from "./level-up-modal";
import { BadgesDisplay } from "./badges-display";
import { StreakDisplay } from "./streak-display";
import type { BadgeDefinition } from "@/lib/badge-definitions";

interface GamProfile {
  user_id: string;
  level: number;
  level_name: string;
  total_points: number;
  current_streak: number;
  badges: Array<{ badge_id: string; name: string; earned_at: string }>;
}

interface Challenge {
  id: string;
  title: string;
  description: string | null;
  target_value: number;
  metric: string;
  points_reward: number;
  start_date: string | null;
  end_date: string | null;
}

interface LeaderboardEntry {
  user_id: string;
  level: number;
  level_name: string;
  total_points: number;
  user: { full_name: string | null; avatar_url: string | null } | null;
}

interface Props {
  gamProfile: GamProfile | null;
  challenges: Challenge[];
  progressMap: Record<string, { current_value: number; completed: boolean }>;
  leaderboard: LeaderboardEntry[];
  currentUserId: string;
  allBadges: BadgeDefinition[];
}

const LEVELS = [
  { level: 1, name: "Setter Débutant", minPoints: 0, maxPoints: 99 },
  { level: 2, name: "Setter Confirmé", minPoints: 100, maxPoints: 299 },
  { level: 3, name: "Setter Senior", minPoints: 300, maxPoints: 599 },
  { level: 4, name: "Setter Elite", minPoints: 600, maxPoints: 999 },
  { level: 5, name: "Setter Légende", minPoints: 1000, maxPoints: 99999 },
];

export function ChallengesView({ gamProfile, challenges, progressMap, leaderboard, currentUserId, allBadges }: Props) {
  const [showLevelUp] = useState(false);

  const currentLevel = LEVELS.find((l) => l.level === (gamProfile?.level || 1)) || LEVELS[0];
  const nextLevel = LEVELS.find((l) => l.level === currentLevel.level + 1);
  const pointsInLevel = (gamProfile?.total_points || 0) - currentLevel.minPoints;
  const pointsNeeded = nextLevel ? nextLevel.minPoints - currentLevel.minPoints : 1;
  const levelProgress = nextLevel ? Math.round((pointsInLevel / pointsNeeded) * 100) : 100;

  const activeChallenges = challenges.filter((c) => !progressMap[c.id]?.completed);
  const completedChallenges = challenges.filter((c) => progressMap[c.id]?.completed);

  return (
    <div>
      <PageHeader
        title="Défis & Gamification"
        description="Relevez des challenges et grimpez dans le classement"
      >
        <Link href="/challenges/rewards">
          <Button variant="outline" size="sm">
            <Gift className="h-4 w-4 mr-2" />
            R\u00e9compenses
          </Button>
        </Link>
        <Link href="/challenges/analytics">
          <Button variant="outline" size="sm">
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </Button>
        </Link>
      </PageHeader>

      {/* Profile banner */}
      <Card className="mb-6 bg-gradient-to-r from-brand-dark to-brand-dark/80 text-white border-0">
        <CardContent className="p-6">
          <div className="flex items-center gap-6 flex-wrap">
            <div className="h-16 w-16 rounded-full bg-brand/20 border-2 border-brand flex items-center justify-center">
              <Star className="h-8 w-8 text-brand" />
            </div>
            <div className="flex-1 min-w-[200px]">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl font-bold">{gamProfile?.level_name || "Setter Débutant"}</h2>
                <Badge className="bg-brand text-brand-dark">Niv. {gamProfile?.level || 1}</Badge>
              </div>
              <p className="text-white/60 text-sm mb-2">
                {gamProfile?.total_points || 0} points au total
              </p>
              {nextLevel && (
                <div>
                  <div className="flex justify-between text-xs text-white/50 mb-1">
                    <span>{gamProfile?.total_points || 0} pts</span>
                    <span>{nextLevel.minPoints} pts</span>
                  </div>
                  <Progress value={levelProgress} className="h-2 [&>div]:bg-brand" />
                </div>
              )}
            </div>
            <div className="flex gap-6 text-center">
              <div>
                <div className="flex items-center justify-center gap-1 text-brand mb-1">
                  <Flame className="h-5 w-5" />
                  <span className="text-2xl font-bold">{gamProfile?.current_streak || 0}</span>
                </div>
                <p className="text-xs text-white/50">Jours streak</p>
              </div>
              <div>
                <div className="flex items-center justify-center gap-1 text-brand mb-1">
                  <Trophy className="h-5 w-5" />
                  <span className="text-2xl font-bold">{completedChallenges.length}</span>
                </div>
                <p className="text-xs text-white/50">Défis gagnés</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Streak + Badges section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-1">
          <StreakDisplay
            currentStreak={gamProfile?.current_streak || 0}
            userId={currentUserId}
          />
        </div>
        <div className="lg:col-span-2">
          <BadgesDisplay
            allBadges={allBadges}
            earnedBadges={gamProfile?.badges || []}
            userId={currentUserId}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Challenges */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Target className="h-5 w-5 text-brand" />
            Défis en cours ({activeChallenges.length})
          </h2>
          {activeChallenges.map((challenge) => {
            const prog = progressMap[challenge.id];
            const current = prog?.current_value || 0;
            const percent = challenge.target_value > 0 ? Math.round((current / challenge.target_value) * 100) : 0;
            return (
              <Card key={challenge.id}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold mb-1">{challenge.title}</h3>
                      <p className="text-sm text-muted-foreground">{challenge.description}</p>
                    </div>
                    <Badge className="bg-brand/10 text-brand shrink-0 ml-4">
                      <Zap className="h-3 w-3 mr-1" />
                      {challenge.points_reward} pts
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="font-medium">{current}/{challenge.target_value}</span>
                    {challenge.end_date && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(challenge.end_date), "d MMM", { locale: fr })}
                      </span>
                    )}
                  </div>
                  <Progress value={percent} className="h-2.5" />
                </CardContent>
              </Card>
            );
          })}

          {activeChallenges.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Aucun défi en cours. De nouveaux défis arrivent bientôt !</p>
              </CardContent>
            </Card>
          )}

          {completedChallenges.length > 0 && (
            <>
              <h2 className="text-lg font-semibold flex items-center gap-2 mt-6">
                <CheckCircle2 className="h-5 w-5 text-brand" />
                Défis complétés ({completedChallenges.length})
              </h2>
              {completedChallenges.map((challenge) => (
                <Card key={challenge.id} className="opacity-70">
                  <CardContent className="p-4 flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-brand shrink-0" />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{challenge.title}</p>
                    </div>
                    <Badge variant="outline" className="text-brand">
                      +{challenge.points_reward} pts
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </>
          )}
        </div>

        {/* Leaderboard */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Medal className="h-5 w-5 text-brand" />
              Classement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {leaderboard.map((player, i) => {
                const rank = i + 1;
                const isMe = player.user_id === currentUserId;
                return (
                  <div
                    key={player.user_id}
                    className={`flex items-center gap-3 p-3 rounded-lg ${
                      isMe ? "bg-brand/10 ring-1 ring-brand/30" : rank <= 3 ? "bg-muted/50" : ""
                    }`}
                  >
                    <span
                      className={`text-lg font-bold w-6 text-center ${
                        rank === 1 ? "text-yellow-500" :
                        rank === 2 ? "text-gray-400" :
                        rank === 3 ? "text-orange-400" :
                        "text-muted-foreground"
                      }`}
                    >
                      {rank}
                    </span>
                    <div className="h-8 w-8 rounded-full bg-brand/10 flex items-center justify-center text-brand text-xs font-bold">
                      {player.user?.full_name?.charAt(0) || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {player.user?.full_name || "Anonyme"} {isMe && "(vous)"}
                      </p>
                      <p className="text-xs text-muted-foreground">{player.level_name}</p>
                    </div>
                    <span className="text-sm font-semibold">{player.total_points} pts</span>
                  </div>
                );
              })}
              {leaderboard.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-4">
                  Pas encore de classement
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {showLevelUp && gamProfile && (
        <LevelUpModal
          level={gamProfile.level}
          levelName={gamProfile.level_name}
        />
      )}
    </div>
  );
}
