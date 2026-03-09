"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Trophy,
  Flame,
  Star,
  Target,
  Users,
  Zap,
  Phone,
  PhoneCall,
  Crown,
  Handshake,
  Lock,
  RefreshCw,
  type LucideIcon,
} from "lucide-react";
import { checkBadgeEligibility } from "@/lib/actions/gamification";
import type { BadgeDefinition } from "@/lib/badge-definitions";
import { toast } from "sonner";

// Map icon name strings to actual Lucide components
const ICON_MAP: Record<string, LucideIcon> = {
  Trophy,
  Flame,
  Star,
  Target,
  Users,
  Zap,
  Phone,
  PhoneCall,
  Crown,
  Handshake,
};

interface EarnedBadge {
  badge_id: string;
  name: string;
  earned_at: string;
}

interface Props {
  allBadges: BadgeDefinition[];
  earnedBadges: EarnedBadge[];
  userId: string;
}

export function BadgesDisplay({ allBadges, earnedBadges, userId }: Props) {
  const [isPending, startTransition] = useTransition();
  const earnedIds = new Set(earnedBadges.map((b) => b.badge_id));

  // Group badges by category
  const categories: Record<string, { label: string; badges: BadgeDefinition[] }> = {
    performance: { label: "Performance", badges: [] },
    streak: { label: "Streaks", badges: [] },
    social: { label: "Social", badges: [] },
    milestone: { label: "Jalons", badges: [] },
  };

  for (const badge of allBadges) {
    categories[badge.category]?.badges.push(badge);
  }

  function handleCheckBadges() {
    startTransition(async () => {
      const newBadges = await checkBadgeEligibility(userId);
      if (newBadges.length > 0) {
        toast.success(`${newBadges.length} nouveau(x) badge(s) debloque(s) !`, {
          style: { background: "#14080e", color: "#fff" },
        });
      } else {
        toast.info("Aucun nouveau badge pour le moment. Continuez vos efforts !", {
          style: { background: "#14080e", color: "#fff" },
        });
      }
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2">
          <Trophy className="h-5 w-5 text-brand" />
          Badges ({earnedBadges.length}/{allBadges.length})
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={handleCheckBadges}
          disabled={isPending}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isPending ? "animate-spin" : ""}`} />
          Verifier mes badges
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {Object.entries(categories).map(([key, { label, badges }]) => {
          if (badges.length === 0) return null;
          return (
            <div key={key}>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                {label}
              </h3>
              <div className="flex flex-wrap gap-4">
                <TooltipProvider>
                  {badges.map((badge) => {
                    const isEarned = earnedIds.has(badge.id);
                    const earned = earnedBadges.find((b) => b.badge_id === badge.id);
                    const IconComponent = ICON_MAP[badge.icon] || Trophy;

                    return (
                      <Tooltip key={badge.id}>
                        <TooltipTrigger asChild>
                          <div
                            className={`relative flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all w-[90px] ${
                              isEarned
                                ? "border-brand/40 bg-brand/5 shadow-sm"
                                : "border-muted bg-muted/30 opacity-50 grayscale"
                            }`}
                          >
                            <div
                              className={`h-10 w-10 rounded-full flex items-center justify-center ${
                                isEarned ? "bg-brand/20" : "bg-muted"
                              }`}
                            >
                              {isEarned ? (
                                <IconComponent
                                  className="h-5 w-5"
                                  style={{ color: badge.color }}
                                />
                              ) : (
                                <Lock className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                            <span className="text-[11px] font-medium text-center leading-tight">
                              {badge.name}
                            </span>
                            {isEarned && (
                              <span className="text-[10px] text-brand font-semibold">
                                +{badge.points} pts
                              </span>
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          <div className="text-center">
                            <p className="font-semibold">{badge.name}</p>
                            <p className="text-xs opacity-80">{badge.description}</p>
                            {isEarned && earned && (
                              <p className="text-xs text-brand mt-1">
                                Obtenu le{" "}
                                {new Date(earned.earned_at).toLocaleDateString("fr-FR")}
                              </p>
                            )}
                            {!isEarned && (
                              <p className="text-xs mt-1 opacity-60">
                                Recompense : +{badge.points} pts
                              </p>
                            )}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </TooltipProvider>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
