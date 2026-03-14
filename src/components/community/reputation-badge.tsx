"use client";

import { Badge } from "@/components/ui/badge";
import { Star, Award, GraduationCap, Shield, Crown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ReputationLevel {
  label: string;
  minScore: number;
  color: string;
  icon: React.ElementType;
}

export const REPUTATION_LEVELS: ReputationLevel[] = [
  { label: "Nouveau", minScore: 0, color: "bg-muted text-muted-foreground border-border/40", icon: Star },
  { label: "Contributeur", minScore: 50, color: "bg-blue-500/10 text-blue-600 border-blue-500/20", icon: Award },
  { label: "Expert", minScore: 150, color: "bg-purple-500/10 text-purple-600 border-purple-500/20", icon: GraduationCap },
  { label: "Mentor", minScore: 300, color: "bg-amber-500/10 text-amber-600 border-amber-500/20", icon: Shield },
  { label: "Leader", minScore: 500, color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", icon: Crown },
];

export function getReputationLevel(score: number): ReputationLevel {
  for (let i = REPUTATION_LEVELS.length - 1; i >= 0; i--) {
    if (score >= REPUTATION_LEVELS[i].minScore) return REPUTATION_LEVELS[i];
  }
  return REPUTATION_LEVELS[0];
}

interface ReputationBadgeProps {
  score: number;
  showScore?: boolean;
  className?: string;
}

export function ReputationBadge({ score, showScore = false, className }: ReputationBadgeProps) {
  const level = getReputationLevel(score);
  const Icon = level.icon;

  return (
    <Badge variant="outline" className={cn(level.color, "gap-1 text-[10px] leading-tight", className)}>
      <Icon className="h-3 w-3" />
      {level.label}
      {showScore && <span className="opacity-70">({score})</span>}
    </Badge>
  );
}
