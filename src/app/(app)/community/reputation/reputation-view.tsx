"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sprout,
  MessageSquare,
  Award,
  GraduationCap,
  Crown,
  Star,
  TrendingUp,
  FileText,
  ThumbsUp,
  Reply,
  Trophy,
  Zap,
} from "lucide-react";
import {
  REPUTATION_RANKS,
  getReputationRank,
  getNextRank,
} from "@/lib/reputation-definitions";

// Map rank to icon component (since LucideIcon can't be serialized from server)
const RANK_ICONS: Record<string, typeof Star> = {
  novice: Sprout,
  contributeur: MessageSquare,
  expert: Award,
  mentor: GraduationCap,
  legende: Crown,
};

interface ReputationViewProps {
  userReputation: {
    userId: string;
    fullName: string | null;
    avatarUrl: string | null;
    points: number;
    breakdown: {
      posts: number;
      replies: number;
      likes: number;
      bestAnswers: number;
    };
  };
  leaderboard: {
    position: number;
    userId: string;
    fullName: string;
    avatarUrl: string | null;
    points: number;
    posts: number;
    replies: number;
    likes: number;
    bestAnswers: number;
  }[];
  activity: {
    label: string;
    points: number;
    date: string;
  }[];
}

function RankIcon({ rank, size = 20 }: { rank: string; size?: number }) {
  const Icon = RANK_ICONS[rank] || Star;
  return <Icon size={size} />;
}

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMs / 3600000);
  const diffD = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "A l'instant";
  if (diffMin < 60) return `Il y a ${diffMin} min`;
  if (diffH < 24) return `Il y a ${diffH}h`;
  if (diffD < 7) return `Il y a ${diffD}j`;
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export function ReputationView({
  userReputation,
  leaderboard,
  activity,
}: ReputationViewProps) {
  const currentRank = getReputationRank(userReputation.points);
  const nextRank = getNextRank(userReputation.points);

  const progressPercent = nextRank
    ? ((userReputation.points - currentRank.minPoints) /
        (nextRank.minPoints - currentRank.minPoints)) *
      100
    : 100;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Réputation"
        description="Votre score de réputation dans la communauté"
      />

      {/* User Rank Card */}
      <Card className="border-border/50">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Rank display */}
            <div className="flex items-center gap-4">
              <div
                className="flex items-center justify-center w-16 h-16 rounded-full"
                style={{ backgroundColor: `${currentRank.color}20`, color: currentRank.color }}
              >
                <RankIcon rank={currentRank.rank} size={32} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold">{currentRank.name}</h2>
                  <Badge
                    variant="outline"
                    style={{ borderColor: currentRank.color, color: currentRank.color }}
                  >
                    {userReputation.points} pts
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {userReputation.fullName || "Utilisateur"}
                </p>
              </div>
            </div>

            {/* Progress to next rank */}
            <div className="flex-1 flex flex-col justify-center">
              {nextRank ? (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Prochain rang : <span className="font-medium text-foreground">{nextRank.name}</span>
                    </span>
                    <span className="text-muted-foreground">
                      {userReputation.points} / {nextRank.minPoints} pts
                    </span>
                  </div>
                  <Progress value={progressPercent} className="h-3" />
                  <p className="text-xs text-muted-foreground">
                    Plus que {nextRank.minPoints - userReputation.points} points pour atteindre le rang {nextRank.name}
                  </p>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm">
                  <Crown size={16} className="text-[#fbbf24]" />
                  <span className="font-medium">Rang maximum atteint !</span>
                </div>
              )}
            </div>
          </div>

          {/* Breakdown */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-border/50">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#7af17a]/10">
                <FileText size={18} className="text-[#7af17a]" />
              </div>
              <div>
                <p className="text-lg font-bold">{userReputation.breakdown.posts}</p>
                <p className="text-xs text-muted-foreground">Posts ({userReputation.breakdown.posts * 10} pts)</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-500/10">
                <Reply size={18} className="text-blue-500" />
              </div>
              <div>
                <p className="text-lg font-bold">{userReputation.breakdown.replies}</p>
                <p className="text-xs text-muted-foreground">Réponses ({userReputation.breakdown.replies * 5} pts)</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-purple-500/10">
                <ThumbsUp size={18} className="text-purple-500" />
              </div>
              <div>
                <p className="text-lg font-bold">{userReputation.breakdown.likes}</p>
                <p className="text-xs text-muted-foreground">Likes ({userReputation.breakdown.likes * 2} pts)</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-500/10">
                <Trophy size={18} className="text-amber-500" />
              </div>
              <div>
                <p className="text-lg font-bold">{userReputation.breakdown.bestAnswers}</p>
                <p className="text-xs text-muted-foreground">Meilleures rép. ({userReputation.breakdown.bestAnswers * 50} pts)</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Leaderboard */}
        <div className="lg:col-span-2">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp size={20} className="text-[#7af17a]" />
                Classement
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Membre</TableHead>
                    <TableHead className="text-right">Points</TableHead>
                    <TableHead className="text-center hidden sm:table-cell">Rang</TableHead>
                    <TableHead className="text-right hidden md:table-cell">Posts</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaderboard.map((entry) => {
                    const rank = getReputationRank(entry.points);
                    return (
                      <TableRow key={entry.userId}>
                        <TableCell>
                          {entry.position <= 3 ? (
                            <span
                              className="flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold"
                              style={{
                                backgroundColor:
                                  entry.position === 1
                                    ? "#fbbf2430"
                                    : entry.position === 2
                                    ? "#94a3b830"
                                    : "#cd7f3230",
                                color:
                                  entry.position === 1
                                    ? "#fbbf24"
                                    : entry.position === 2
                                    ? "#94a3b8"
                                    : "#cd7f32",
                              }}
                            >
                              {entry.position}
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground pl-2">
                              {entry.position}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={entry.avatarUrl || undefined} />
                              <AvatarFallback className="text-xs">
                                {getInitials(entry.fullName)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-sm">{entry.fullName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          {entry.points.toLocaleString("fr-FR")}
                        </TableCell>
                        <TableCell className="text-center hidden sm:table-cell">
                          <Badge
                            variant="outline"
                            className="gap-1"
                            style={{ borderColor: rank.color, color: rank.color }}
                          >
                            <RankIcon rank={rank.rank} size={12} />
                            {rank.name}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground hidden md:table-cell">
                          {entry.posts}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar: Activity + Ranks explanation */}
        <div className="space-y-6">
          {/* Recent Activity */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Zap size={18} className="text-[#7af17a]" />
                Activité récente
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activity.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aucune activité récente
                </p>
              ) : (
                <div className="space-y-3">
                  {activity.map((event, i) => (
                    <div key={i} className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{event.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatTimeAgo(event.date)}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className="shrink-0 text-[#7af17a] border-[#7af17a]/30"
                      >
                        +{event.points} pts
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Ranks Explanation */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Star size={18} className="text-[#7af17a]" />
                Rangs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {REPUTATION_RANKS.map((rankInfo) => {
                  const isCurrentRank = rankInfo.rank === currentRank.rank;
                  return (
                    <div
                      key={rankInfo.rank}
                      className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                        isCurrentRank ? "bg-muted/50 ring-1 ring-border" : ""
                      }`}
                    >
                      <div
                        className="flex items-center justify-center w-9 h-9 rounded-full shrink-0"
                        style={{
                          backgroundColor: `${rankInfo.color}20`,
                          color: rankInfo.color,
                        }}
                      >
                        <RankIcon rank={rankInfo.rank} size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{rankInfo.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {rankInfo.minPoints === 0
                            ? "Dès l'inscription"
                            : `${rankInfo.minPoints.toLocaleString("fr-FR")} pts requis`}
                        </p>
                      </div>
                      {isCurrentRank && (
                        <Badge variant="secondary" className="text-xs shrink-0">
                          Actuel
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
