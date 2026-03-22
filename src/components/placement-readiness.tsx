"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  GraduationCap,
  BrainCircuit,
  Swords,
  CalendarDays,
  Users,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PlacementData {
  score: number;
  level: "not_ready" | "almost" | "ready" | "placed";
  breakdown: {
    modules: number;
    quizzes: number;
    roleplay: number;
    journal: number;
    community: number;
  };
  isReady: boolean;
}

interface Props {
  data: PlacementData | null;
  compact?: boolean;
}

const LEVEL_LABELS: Record<string, { label: string; color: string }> = {
  not_ready: { label: "Pas prêt", color: "text-red-500" },
  almost: { label: "En progression", color: "text-orange-500" },
  ready: { label: "Presque prêt", color: "text-green-500" },
  placed: { label: "Prêt à être placé !", color: "text-green-400" },
};

const BREAKDOWN_ITEMS = [
  {
    key: "modules" as const,
    label: "Modules",
    icon: GraduationCap,
    weight: "40%",
  },
  { key: "quizzes" as const, label: "Quiz", icon: BrainCircuit, weight: "25%" },
  { key: "roleplay" as const, label: "Roleplay", icon: Swords, weight: "15%" },
  {
    key: "journal" as const,
    label: "Journal",
    icon: CalendarDays,
    weight: "10%",
  },
  {
    key: "community" as const,
    label: "Communauté",
    icon: Users,
    weight: "10%",
  },
];

function getScoreColor(score: number) {
  if (score < 40) return "#ef4444"; // red
  if (score < 70) return "#f97316"; // orange
  if (score < 90) return "#10b981"; // brand green
  return "#10b981"; // brand green with glow
}

function CircularGauge({
  score,
  size = 140,
}: {
  score: number;
  size?: number;
}) {
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedScore(score), 100);
    return () => clearTimeout(timer);
  }, [score]);

  const offset = circumference - (animatedScore / 100) * circumference;
  const color = getScoreColor(score);
  const hasGlow = score >= 90;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/30"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
          style={
            hasGlow ? { filter: `drop-shadow(0 0 8px ${color})` } : undefined
          }
        />
      </svg>
      {/* Score in center */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="text-3xl font-bold transition-colors duration-500"
          style={{ color }}
        >
          {animatedScore}
        </span>
        <span className="text-xs text-muted-foreground">/ 100</span>
      </div>
    </div>
  );
}

export function PlacementReadiness({ data, compact }: Props) {
  if (!data) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          <p className="text-sm">Données de placement non disponibles</p>
        </CardContent>
      </Card>
    );
  }

  const levelInfo = LEVEL_LABELS[data.level] || LEVEL_LABELS.not_ready;

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <CircularGauge score={data.score} size={64} />
        <div>
          <p className={cn("text-sm font-semibold", levelInfo.color)}>
            {levelInfo.label}
          </p>
          <p className="text-xs text-muted-foreground">{data.score}% prêt</p>
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-[#10b981]" />
          Indicateur de Placement
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center mb-6">
          <CircularGauge score={data.score} />
          <p className={cn("text-base font-semibold mt-3", levelInfo.color)}>
            {levelInfo.label}
          </p>

          {data.score >= 90 && (
            <Badge className="mt-2 bg-green-500/20 text-green-400 border-green-500/50 animate-pulse">
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
              Prêt au placement
            </Badge>
          )}
        </div>

        {/* Breakdown bars */}
        <div className="space-y-3">
          {BREAKDOWN_ITEMS.map((item) => {
            const Icon = item.icon;
            const value = data.breakdown[item.key];
            return (
              <div key={item.key}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Icon className="h-3.5 w-3.5" />
                    <span>{item.label}</span>
                    <span className="opacity-50">({item.weight})</span>
                  </div>
                  <span className="text-xs font-medium">{value}%</span>
                </div>
                <Progress value={value} className="h-2" />
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
