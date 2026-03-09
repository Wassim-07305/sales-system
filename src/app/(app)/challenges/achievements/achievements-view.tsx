"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Trophy,
  Lock,
  Star,
  Medal,
  ArrowLeft,
  Handshake,
  TrendingUp,
  Zap,
  Crown,
  Phone,
  PhoneCall,
  Headphones,
  PhoneForwarded,
  Target,
  Crosshair,
  Network,
  Flame,
  MessageSquare,
  Megaphone,
  Users,
  Moon,
  Sunrise,
  Timer,
  HelpCircle,
} from "lucide-react";
import type { Achievement } from "@/lib/achievement-definitions";
import { TIER_COLORS, CATEGORY_LABELS } from "@/lib/achievement-definitions";

// Map icon names to components
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Handshake,
  TrendingUp,
  Zap,
  Crown,
  Phone,
  PhoneCall,
  Headphones,
  PhoneForwarded,
  Target,
  Crosshair,
  Network,
  Flame,
  MessageSquare,
  Megaphone,
  Users,
  Moon,
  Sunrise,
  Timer,
  Trophy,
  Star,
  Medal,
  Lock,
};

type CategoryFilter = "all" | Achievement["category"];

interface AchievementWithProgress extends Achievement {
  currentValue: number;
  unlocked: boolean;
  unlockedAt: string | null;
}

interface Props {
  achievements: AchievementWithProgress[];
  totalPoints: number;
}

export function AchievementsView({ achievements, totalPoints }: Props) {
  const [filter, setFilter] = useState<CategoryFilter>("all");

  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const totalCount = achievements.length;
  const earnedPoints = achievements
    .filter((a) => a.unlocked)
    .reduce((sum, a) => sum + a.points, 0);

  // Recently unlocked (sorted by date, top 5)
  const recentlyUnlocked = achievements
    .filter((a) => a.unlocked && a.unlockedAt)
    .sort((a, b) => (b.unlockedAt ?? "").localeCompare(a.unlockedAt ?? ""))
    .slice(0, 5);

  // Filtered achievements
  const filtered =
    filter === "all"
      ? achievements
      : achievements.filter((a) => a.category === filter);

  return (
    <div>
      <PageHeader
        title="Achievements"
        description="Debloquez des achievements en atteignant vos objectifs de vente"
      >
        <Link href="/challenges">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour aux defis
          </Button>
        </Link>
      </PageHeader>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className="bg-gradient-to-r from-brand-dark to-brand-dark/80 text-white border-0">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-full bg-brand/20 border-2 border-brand flex items-center justify-center">
                <Trophy className="h-5 w-5 text-brand" />
              </div>
              <div>
                <p className="text-white/60 text-xs">Achievements debloques</p>
                <p className="text-2xl font-bold">
                  {unlockedCount}
                  <span className="text-base text-white/40 font-normal">
                    /{totalCount}
                  </span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-brand-dark to-brand-dark/80 text-white border-0">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-full bg-brand/20 border-2 border-brand flex items-center justify-center">
                <Star className="h-5 w-5 text-brand" />
              </div>
              <div>
                <p className="text-white/60 text-xs">Points gagnes</p>
                <p className="text-2xl font-bold">
                  {earnedPoints.toLocaleString("fr-FR")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-brand-dark to-brand-dark/80 text-white border-0">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-full bg-brand/20 border-2 border-brand flex items-center justify-center">
                <Medal className="h-5 w-5 text-brand" />
              </div>
              <div>
                <p className="text-white/60 text-xs">Points totaux</p>
                <p className="text-2xl font-bold">
                  {totalPoints.toLocaleString("fr-FR")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recently unlocked */}
      {recentlyUnlocked.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
            <Star className="h-5 w-5 text-brand" />
            Recemment debloques
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {recentlyUnlocked.map((ach) => {
              const IconComponent = ICON_MAP[ach.icon] || Trophy;
              const tierColor = TIER_COLORS[ach.tier];
              return (
                <Card
                  key={ach.id}
                  className="min-w-[180px] shrink-0 border-0"
                  style={{
                    background: `linear-gradient(135deg, ${tierColor}15, ${tierColor}05)`,
                    borderLeft: `3px solid ${tierColor}`,
                  }}
                >
                  <CardContent className="p-4 flex items-center gap-3">
                    <div
                      className="h-10 w-10 rounded-full flex items-center justify-center shrink-0"
                      style={{
                        border: `2px solid ${tierColor}`,
                        backgroundColor: `${tierColor}20`,
                      }}
                    >
                      <span style={{ color: tierColor }}>
                        <IconComponent className="h-5 w-5" />
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">
                        {ach.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        +{ach.points} pts
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <Tabs
        value={filter}
        onValueChange={(v) => setFilter(v as CategoryFilter)}
        className="mb-6"
      >
        <TabsList>
          <TabsTrigger value="all">Tous</TabsTrigger>
          {(
            Object.entries(CATEGORY_LABELS) as [
              Achievement["category"],
              string,
            ][]
          ).map(([key, label]) => (
            <TabsTrigger key={key} value={key}>
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Achievement grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((ach) => (
          <AchievementCard key={ach.id} achievement={ach} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Trophy className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Aucun achievement dans cette categorie</p>
        </div>
      )}
    </div>
  );
}

function AchievementCard({
  achievement,
}: {
  achievement: AchievementWithProgress;
}) {
  const ach = achievement;
  const tierColor = TIER_COLORS[ach.tier];
  const IconComponent = ICON_MAP[ach.icon] || Trophy;
  const progress =
    ach.targetValue > 0
      ? Math.round((ach.currentValue / ach.targetValue) * 100)
      : 0;
  const isHiddenLocked = ach.hidden && !ach.unlocked;
  const isNotStarted = !ach.unlocked && ach.currentValue === 0;

  return (
    <Card
      className={`relative overflow-hidden transition-all ${
        isHiddenLocked
          ? "bg-muted/30"
          : isNotStarted && !ach.hidden
            ? "grayscale-[60%] opacity-70"
            : ""
      }`}
      style={
        ach.unlocked
          ? { borderColor: tierColor, boxShadow: `0 0 0 1px ${tierColor}` }
          : {}
      }
    >
      {/* Hidden overlay */}
      {isHiddenLocked && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
          <HelpCircle className="h-10 w-10 text-muted-foreground/40 mb-2" />
          <p className="text-sm font-medium text-muted-foreground">Cache</p>
          <p className="text-xs text-muted-foreground/60">
            Continuez a jouer pour debloquer
          </p>
        </div>
      )}

      <CardContent className="p-5">
        <div className="flex items-start gap-3 mb-3">
          {/* Icon with tier border */}
          <div
            className="h-12 w-12 rounded-full flex items-center justify-center shrink-0"
            style={{
              border: `2.5px solid ${ach.unlocked ? tierColor : "#555"}`,
              backgroundColor: ach.unlocked ? `${tierColor}20` : "transparent",
            }}
          >
            {isHiddenLocked ? (
              <Lock className="h-5 w-5 text-muted-foreground/40" />
            ) : (
              <span style={{ color: ach.unlocked ? tierColor : "#888" }}>
                <IconComponent className="h-5 w-5" />
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="font-semibold text-sm truncate">
                {isHiddenLocked ? "???" : ach.name}
              </h3>
              <Badge
                variant="outline"
                className="shrink-0 text-[10px] px-1.5 py-0"
                style={{
                  color: tierColor,
                  borderColor: `${tierColor}50`,
                }}
              >
                {ach.tier}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2">
              {isHiddenLocked ? "Achievement cache" : ach.description}
            </p>
          </div>
        </div>

        {/* Progress */}
        {!isHiddenLocked && (
          <div>
            {ach.unlocked ? (
              <div className="flex items-center justify-between">
                <Badge
                  className="text-[11px]"
                  style={{
                    backgroundColor: `${tierColor}20`,
                    color: tierColor,
                    border: "none",
                  }}
                >
                  Debloque
                </Badge>
                <span className="text-xs text-muted-foreground">
                  +{ach.points} pts
                </span>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                  <span>{ach.requirement}</span>
                  <span>
                    {ach.currentValue}/{ach.targetValue}
                  </span>
                </div>
                <Progress
                  value={progress}
                  className="h-2"
                  style={
                    {
                      "--progress-color": tierColor,
                    } as React.CSSProperties
                  }
                />
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
