"use client";

import { useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Flame, CalendarCheck, RefreshCw } from "lucide-react";
import { checkAndUpdateStreak } from "@/lib/actions/gamification";
import { toast } from "sonner";

interface Props {
  currentStreak: number;
  userId: string;
}

export function StreakDisplay({ currentStreak, userId }: Props) {
  const [isPending, startTransition] = useTransition();

  // Visual tiers for streak flames
  const streakColor =
    currentStreak >= 30
      ? "text-red-500"
      : currentStreak >= 7
        ? "text-orange-400"
        : currentStreak >= 3
          ? "text-amber-400"
          : "text-muted-foreground";

  const streakBg =
    currentStreak >= 30
      ? "bg-red-500/10 border-red-500/30"
      : currentStreak >= 7
        ? "bg-orange-400/10 border-orange-400/30"
        : currentStreak >= 3
          ? "bg-amber-400/10 border-amber-400/30"
          : "bg-muted/50 border-muted";

  function handleRefresh() {
    startTransition(async () => {
      const result = await checkAndUpdateStreak(userId);
      toast.success(`Streak actuel : ${result.streak} jour(s)`, {
        style: { background: "#09090b", color: "#fff" },
      });
    });
  }

  // Build the 7-day visual track
  const days = ["L", "M", "M", "J", "V", "S", "D"];

  return (
    <Card className={`rounded-2xl border ${streakBg}`}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className={`h-12 w-12 rounded-full flex items-center justify-center ${
                currentStreak > 0 ? "bg-emerald-500/20" : "bg-muted"
              }`}
            >
              <Flame
                className={`h-6 w-6 ${currentStreak > 0 ? streakColor : "text-muted-foreground"}`}
              />
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className={`text-3xl font-bold ${streakColor}`}>
                  {currentStreak}
                </span>
                <span className="text-sm text-muted-foreground">
                  jour{currentStreak !== 1 ? "s" : ""} de suite
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {currentStreak >= 30
                  ? "Incroyable ! Vous etes en feu !"
                  : currentStreak >= 7
                    ? "Superbe serie ! Continuez !"
                    : currentStreak >= 3
                      ? "Bonne dynamique !"
                      : currentStreak > 0
                        ? "C'est un bon debut !"
                        : "Remplissez votre journal pour lancer votre streak"}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={isPending}
            title="Actualiser le streak"
          >
            <RefreshCw
              className={`h-4 w-4 ${isPending ? "animate-spin" : ""}`}
            />
          </Button>
        </div>

        {/* 7-day progress visual */}
        <div className="flex items-center justify-between gap-1">
          {days.map((day, i) => {
            const isFilled = i < Math.min(currentStreak, 7);
            return (
              <div key={i} className="flex flex-col items-center gap-1 flex-1">
                <div
                  className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium transition-all ${
                    isFilled
                      ? "bg-emerald-500 text-black"
                      : "bg-muted/50 text-muted-foreground"
                  }`}
                >
                  {isFilled ? <CalendarCheck className="h-4 w-4" /> : day}
                </div>
                <span className="text-[10px] text-muted-foreground">{day}</span>
              </div>
            );
          })}
        </div>

        {currentStreak >= 7 && (
          <div className="mt-3 text-center">
            <span className="text-xs text-emerald-500 font-medium">
              + {Math.floor(currentStreak / 7)} semaine
              {Math.floor(currentStreak / 7) > 1 ? "s" : ""} de streak !
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
