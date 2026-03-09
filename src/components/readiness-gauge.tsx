"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  Brain,
  Swords,
  ClipboardCheck,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import type { ReadinessBreakdown } from "@/lib/actions/readiness";

function getScoreColor(score: number): string {
  if (score >= 80) return "text-green-500";
  if (score >= 50) return "text-yellow-500";
  return "text-red-400";
}

function getProgressColor(score: number): string {
  if (score >= 80) return "bg-green-500";
  if (score >= 50) return "bg-yellow-500";
  return "bg-red-400";
}

export function ReadinessGauge({ readiness }: { readiness: ReadinessBreakdown }) {
  const criteria = [
    {
      label: "Modules termines",
      score: readiness.courseCompletion,
      weight: "40%",
      icon: BookOpen,
      detail: `${readiness.details.coursesCompleted}/${readiness.details.coursesTotal} lecons`,
    },
    {
      label: "Quiz valides",
      score: readiness.quizPerformance,
      weight: "25%",
      icon: Brain,
      detail: `${readiness.details.quizzesPassed}/${readiness.details.quizzesTotal} quiz (moy. ${readiness.details.averageQuizScore}%)`,
    },
    {
      label: "Jeux de roles",
      score: readiness.roleplayScore,
      weight: "20%",
      icon: Swords,
      detail: `${readiness.details.roleplaySessionsDone}/${readiness.details.roleplayMinRequired} sessions (moy. ${readiness.details.averageRoleplayScore}%)`,
    },
    {
      label: "Onboarding",
      score: readiness.onboardingDone,
      weight: "15%",
      icon: ClipboardCheck,
      detail: `${readiness.details.onboardingStepsCompleted}/${readiness.details.onboardingStepsTotal} etapes`,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          {readiness.isReady ? (
            <ShieldCheck className="h-5 w-5 text-green-500" />
          ) : (
            <TrendingUp className="h-5 w-5 text-brand" />
          )}
          Pret a etre place
          {readiness.isReady && (
            <Badge className="bg-green-500/20 text-green-500 border-green-500/30 ml-2">
              Objectif atteint !
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Overall progress */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Progression globale</span>
            <span className={`text-2xl font-bold ${getScoreColor(readiness.overall)}`}>
              {readiness.overall}%
            </span>
          </div>
          <div className="relative h-4 rounded-full bg-muted overflow-hidden">
            <div
              className={`absolute left-0 top-0 h-full rounded-full transition-all duration-700 ${getProgressColor(readiness.overall)}`}
              style={{ width: `${readiness.overall}%` }}
            />
            {/* Threshold marker at 80% */}
            <div
              className="absolute top-0 h-full w-0.5 bg-white/60"
              style={{ left: "80%" }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[10px] text-muted-foreground">0%</span>
            <span className="text-[10px] text-muted-foreground">Seuil: 80%</span>
            <span className="text-[10px] text-muted-foreground">100%</span>
          </div>
        </div>

        {/* Breakdown per criterion */}
        <div className="space-y-3">
          {criteria.map((c) => {
            const Icon = c.icon;
            return (
              <div key={c.label}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium">{c.label}</span>
                    <span className="text-[10px] text-muted-foreground">({c.weight})</span>
                  </div>
                  <span className={`text-xs font-semibold ${getScoreColor(c.score)}`}>
                    {c.score}%
                  </span>
                </div>
                <Progress value={c.score} className="h-1.5" />
                <p className="text-[10px] text-muted-foreground mt-0.5">{c.detail}</p>
              </div>
            );
          })}
        </div>

        {/* Next step hint */}
        {!readiness.isReady && (
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-xs font-medium mb-1">Prochaine etape recommandee</p>
            <p className="text-xs text-muted-foreground">
              {readiness.courseCompletion < 60
                ? "Continue les modules de formation pour progresser rapidement."
                : readiness.quizPerformance < 60
                ? "Valide plus de quiz pour prouver ta maitrise des concepts."
                : readiness.roleplayScore < 60
                ? "Fais des sessions de roleplay IA pour t'entrainer."
                : "Tu y es presque ! Termine les dernieres etapes."}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
