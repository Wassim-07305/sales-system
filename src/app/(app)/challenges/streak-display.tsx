"use client";

import { useTransition, useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Flame, CalendarCheck, RefreshCw, Clock, Award } from "lucide-react";
import { checkAndUpdateStreak } from "@/lib/actions/gamification";
import { toast } from "sonner";

interface Props {
  currentStreak: number;
  userId: string;
}

const STREAK_MILESTONES = [
  { days: 7, label: "1 semaine", color: "text-amber-400 bg-amber-400/10 border-amber-400/30" },
  { days: 14, label: "2 semaines", color: "text-orange-400 bg-orange-400/10 border-orange-400/30" },
  { days: 30, label: "1 mois", color: "text-red-500 bg-red-500/10 border-red-500/30" },
];

function useCountdownToMidnight() {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    function update() {
      const now = new Date();
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0);
      const diff = midnight.getTime() - now.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft(
        `${hours.toString().padStart(2, "0")}h${minutes.toString().padStart(2, "0")}m${seconds.toString().padStart(2, "0")}s`
      );
    }
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return timeLeft;
}

function useIsAfter18h() {
  const [isAfter, setIsAfter] = useState(() => new Date().getHours() >= 18);
  useEffect(() => {
    const interval = setInterval(() => {
      setIsAfter(new Date().getHours() >= 18);
    }, 60000);
    return () => clearInterval(interval);
  }, []);
  return isAfter;
}

export function StreakDisplay({ currentStreak, userId }: Props) {
  const [isPending, startTransition] = useTransition();
  const countdown = useCountdownToMidnight();
  const isAfter18h = useIsAfter18h();

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

  // Determine current milestone badge
  const currentMilestone = [...STREAK_MILESTONES]
    .reverse()
    .find((m) => currentStreak >= m.days);

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

  // Urgency warning: after 18h and streak could be lost
  const showUrgency = isAfter18h && currentStreak > 0;

  return (
    <Card className={`rounded-2xl border ${streakBg}`}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className={`h-14 w-14 rounded-full flex items-center justify-center ${
                currentStreak > 0 ? "bg-emerald-500/20" : "bg-muted"
              }`}
            >
              <Flame
                className={`h-7 w-7 ${currentStreak > 0 ? streakColor : "text-muted-foreground"}`}
              />
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className={`text-4xl font-extrabold tracking-tight ${streakColor}`}>
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

        {/* Countdown to midnight */}
        <div className="flex items-center gap-2 mb-3 p-2 rounded-lg bg-muted/30">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            Temps restant avant minuit :{" "}
          </span>
          <span className="text-xs font-mono font-semibold tabular-nums">
            {countdown}
          </span>
        </div>

        {/* Urgency warning */}
        {showUrgency && (
          <div className="mb-3 p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 animate-pulse">
            <p className="text-xs font-semibold text-red-500 flex items-center gap-2">
              <Flame className="h-3.5 w-3.5" />
              Attention : votre streak expire dans {countdown.split("m")[0]}m
            </p>
          </div>
        )}

        {/* Milestone badges */}
        {currentMilestone && (
          <div className="flex items-center gap-2 mb-3">
            {STREAK_MILESTONES.filter((m) => currentStreak >= m.days).map((m) => (
              <Badge
                key={m.days}
                variant="outline"
                className={`text-[10px] gap-1 ${m.color}`}
              >
                <Award className="h-3 w-3" />
                {m.label}
              </Badge>
            ))}
          </div>
        )}

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
