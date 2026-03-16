"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";
import {
  ArrowLeft,
  Trophy,
  Flame,
  Target,
  Phone,
  BarChart3,
  Star,
  Briefcase,
  Building2,
} from "lucide-react";
import {
  BADGE_DEFINITIONS,
  type BadgeDefinition,
} from "@/lib/badge-definitions";
import type { Profile } from "@/lib/types/database";

const LEVELS = [
  { level: 1, name: "Setter Débutant", minPoints: 0, maxPoints: 99 },
  { level: 2, name: "Setter Confirmé", minPoints: 100, maxPoints: 299 },
  { level: 3, name: "Setter Senior", minPoints: 300, maxPoints: 599 },
  { level: 4, name: "Setter Elite", minPoints: 600, maxPoints: 999 },
  { level: 5, name: "Setter Légende", minPoints: 1000, maxPoints: 99999 },
];

const ROLE_LABELS: Record<string, string> = {
  client_b2b: "Entrepreneur B2B",
  client_b2c: "Setter B2C",
  setter: "Setter",
  closer: "Closer",
  manager: "Manager",
  admin: "Administrateur",
};

interface GamProfile {
  user_id: string;
  level: number;
  level_name: string;
  total_points: number;
  current_streak: number;
  badges: Array<{ badge_id: string; name: string; earned_at: string }>;
}

interface Props {
  profile: Profile;
  gamProfile: GamProfile | null;
  dealCount: number;
  callCount: number;
}

function getInitials(name: string | null) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);
}

export function PublicProfileView({
  profile,
  gamProfile,
  dealCount,
  callCount,
}: Props) {
  const level =
    LEVELS.find((l) => l.level === (gamProfile?.level || 1)) || LEVELS[0];
  const totalPoints = gamProfile?.total_points || 0;
  const xpProgress =
    level.maxPoints > level.minPoints
      ? Math.min(
          ((totalPoints - level.minPoints) /
            (level.maxPoints - level.minPoints)) *
            100,
          100,
        )
      : 100;

  const earnedBadgeIds = (gamProfile?.badges || []).map((b) => b.badge_id);
  const earnedBadges = BADGE_DEFINITIONS.filter((bd: BadgeDefinition) =>
    earnedBadgeIds.includes(bd.id),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profil"
        description={`Profil public de ${profile.full_name || "Utilisateur"}`}
      />

      <Link href="/team">
        <Button variant="ghost" size="sm" className="mb-2">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>
      </Link>

      {/* Profile header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <Avatar className="h-24 w-24 ring-2 ring-[#7af17a]/30">
              <AvatarImage src={profile.avatar_url || undefined} />
              <AvatarFallback className="text-2xl bg-[#7af17a]/20 text-[#7af17a]">
                {getInitials(profile.full_name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 text-center sm:text-left space-y-2">
              <h2 className="text-2xl font-bold">
                {profile.full_name || "Sans nom"}
              </h2>
              <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                <Badge
                  variant="outline"
                  className="text-[#7af17a] border-[#7af17a]/30"
                >
                  {ROLE_LABELS[profile.role] || profile.role}
                </Badge>
                {profile.company && (
                  <Badge variant="secondary">
                    <Building2 className="h-3 w-3 mr-1" />
                    {profile.company}
                  </Badge>
                )}
                {profile.niche && (
                  <Badge variant="secondary">
                    <Briefcase className="h-3 w-3 mr-1" />
                    {profile.niche}
                  </Badge>
                )}
              </div>
              {profile.goals && (
                <p className="text-sm text-muted-foreground mt-2">
                  {profile.goals}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gamification */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-400" />
            Progression
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold">{level.name}</p>
              <p className="text-sm text-muted-foreground">
                Niveau {level.level} — {totalPoints} pts
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-orange-400" />
              <span className="font-bold">
                {gamProfile?.current_streak || 0} jours
              </span>
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{level.minPoints} pts</span>
              <span>{level.maxPoints} pts</span>
            </div>
            <Progress value={xpProgress} className="h-3" />
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          {
            label: "Deals fermés",
            value: dealCount,
            icon: Target,
            color: "text-emerald-400",
          },
          {
            label: "Appels complétés",
            value: callCount,
            icon: Phone,
            color: "text-blue-400",
          },
          {
            label: "Score maturité",
            value: profile.setter_maturity_score || 0,
            icon: BarChart3,
            color: "text-purple-400",
          },
          {
            label: "Streak",
            value: `${gamProfile?.current_streak || 0}j`,
            icon: Flame,
            color: "text-orange-400",
          },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="pt-4 pb-4 text-center">
                <Icon className={cn("h-6 w-6 mx-auto mb-2", stat.color)} />
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Badges */}
      {earnedBadges.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-400" />
              Badges obtenus ({earnedBadges.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {earnedBadges.map((badge: BadgeDefinition) => (
                <div
                  key={badge.id}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30"
                >
                  <div
                    className="h-10 w-10 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: badge.color + "20" }}
                  >
                    <span
                      className="text-lg font-bold"
                      style={{ color: badge.color }}
                    >
                      {badge.name[0]}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{badge.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {badge.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {earnedBadges.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Star className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p>Aucun badge obtenu pour le moment</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
