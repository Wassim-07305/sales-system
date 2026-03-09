"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/layout/page-header";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  ArrowRight,
  Brain,
  Target,
  BookOpen,
  Compass,
  BarChart3,
  Clock,
  Trophy,
  Sparkles,
  CheckCircle2,
  Circle,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types (local)
// ---------------------------------------------------------------------------

interface SkillScore {
  category: string;
  categoryLabel: string;
  score: number;
  level: string;
  correct: number;
  total: number;
}

interface RecommendedCourse {
  id: string;
  title: string;
  description: string | null;
  skill: string;
  skillLabel: string;
  priority: string;
  estimatedMinutes: number;
  progress?: number;
}

interface PathViewProps {
  skills: SkillScore[];
  courses: RecommendedCourse[];
  overallScore: number;
  lastAssessedAt: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const categoryIcons: Record<string, React.ReactNode> = {
  prospection: <Target className="h-4 w-4" />,
  closing: <Trophy className="h-4 w-4" />,
  negociation: <BarChart3 className="h-4 w-4" />,
  communication: <Compass className="h-4 w-4" />,
  objection: <Brain className="h-4 w-4" />,
};

const levelColors: Record<string, string> = {
  "Débutant": "text-red-400 bg-red-400/10 border-red-400/20",
  "Intermédiaire": "text-amber-400 bg-amber-400/10 border-amber-400/20",
  "Avancé": "text-blue-400 bg-blue-400/10 border-blue-400/20",
  "Expert": "text-[#7af17a] bg-[#7af17a]/10 border-[#7af17a]/20",
};

const priorityConfig: Record<
  string,
  { label: string; color: string; dot: string }
> = {
  haute: {
    label: "Haute",
    color: "bg-red-500/20 text-red-400 border-red-500/30",
    dot: "bg-red-400",
  },
  moyenne: {
    label: "Moyenne",
    color: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    dot: "bg-amber-400",
  },
  basse: {
    label: "Basse",
    color: "bg-green-500/20 text-green-400 border-green-500/30",
    dot: "bg-green-400",
  },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PathView({
  skills,
  courses,
  overallScore,
  lastAssessedAt,
}: PathViewProps) {
  const hasDiagnostic = skills.length > 0;
  const weakSkills = skills.filter((s) => s.score < 70);

  // Empty state
  if (!hasDiagnostic) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Parcours d'apprentissage"
          description="Votre plan de formation personnalisé"
        >
          <Button variant="outline" size="sm" asChild>
            <Link href="/academy">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Academy
            </Link>
          </Button>
        </PageHeader>

        <Card className="border-border/50">
          <CardContent className="pt-12 pb-12 flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 rounded-full bg-[#7af17a]/10 flex items-center justify-center">
              <Compass className="h-8 w-8 text-[#7af17a]" />
            </div>
            <div className="space-y-2">
              <h2 className="text-lg font-semibold">
                Aucun diagnostic complété
              </h2>
              <p className="text-sm text-muted-foreground max-w-md">
                Passez le diagnostic de compétences pour obtenir un parcours
                d&apos;apprentissage personnalisé, adapté à votre niveau et vos
                points faibles.
              </p>
            </div>
            <Button
              asChild
              className="bg-[#7af17a] text-[#14080e] hover:bg-[#7af17a]/90 mt-2"
            >
              <Link href="/academy/diagnostic">
                <Brain className="h-4 w-4 mr-2" />
                Passer le diagnostic
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Parcours d'apprentissage"
        description="Votre plan de formation personnalisé basé sur vos résultats"
      >
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/academy">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Academy
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/academy/diagnostic">
              <BarChart3 className="h-4 w-4 mr-2" />
              Diagnostic
            </Link>
          </Button>
        </div>
      </PageHeader>

      {/* Summary card */}
      <Card className="border-[#7af17a]/20 bg-gradient-to-br from-[#7af17a]/5 to-transparent">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="w-20 h-20 rounded-full border-4 border-[#7af17a]/30 flex items-center justify-center">
              <span className="text-2xl font-bold text-[#7af17a]">
                {overallScore}%
              </span>
            </div>
            <div className="text-center sm:text-left flex-1">
              <h2 className="text-lg font-semibold">Votre niveau global</h2>
              {lastAssessedAt && (
                <p className="text-xs text-muted-foreground mt-1">
                  Dernière évaluation :{" "}
                  {new Date(lastAssessedAt).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              )}
              {weakSkills.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <span className="text-xs text-muted-foreground">
                    À améliorer :
                  </span>
                  {weakSkills.map((s) => (
                    <Badge
                      key={s.category}
                      variant="outline"
                      className="text-xs gap-1 border-amber-400/30 text-amber-400"
                    >
                      {categoryIcons[s.category]}
                      {s.categoryLabel}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Skills overview */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {skills.map((skill) => (
          <Card key={skill.category} className="border-border/50">
            <CardContent className="pt-4 pb-4 text-center space-y-2">
              <div className="flex items-center justify-center gap-1.5 text-muted-foreground">
                {categoryIcons[skill.category]}
                <span className="text-xs font-medium">
                  {skill.categoryLabel}
                </span>
              </div>
              <p className="text-xl font-bold">{skill.score}%</p>
              <Badge
                variant="outline"
                className={cn("text-xs", levelColors[skill.level])}
              >
                {skill.level}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Course pathway */}
      {courses.length > 0 ? (
        <div className="space-y-4">
          <h3 className="text-base font-semibold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#7af17a]" />
            Votre parcours recommandé
            <Badge variant="outline" className="text-xs ml-2">
              {courses.length} cours
            </Badge>
          </h3>

          <div className="relative">
            {/* Vertical timeline line */}
            <div className="absolute left-6 top-0 bottom-0 w-px bg-border/50 hidden sm:block" />

            <div className="space-y-4">
              {courses.map((course, idx) => {
                const prio =
                  priorityConfig[course.priority] || priorityConfig.basse;
                const isCompleted =
                  typeof course.progress === "number" && course.progress >= 100;
                const isStarted =
                  typeof course.progress === "number" && course.progress > 0;

                return (
                  <div key={course.id} className="relative flex gap-4">
                    {/* Timeline dot */}
                    <div className="hidden sm:flex flex-col items-center">
                      <div
                        className={cn(
                          "w-12 h-12 rounded-full flex items-center justify-center border-2 flex-shrink-0 z-10 bg-background",
                          isCompleted
                            ? "border-[#7af17a] bg-[#7af17a]/10"
                            : isStarted
                            ? "border-amber-400 bg-amber-400/10"
                            : "border-border/50"
                        )}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="h-5 w-5 text-[#7af17a]" />
                        ) : (
                          <span className="text-sm font-bold text-muted-foreground">
                            {idx + 1}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Course card */}
                    <Card
                      className={cn(
                        "flex-1 border-border/50 hover:border-[#7af17a]/30 transition-colors",
                        isCompleted && "opacity-70"
                      )}
                    >
                      <CardContent className="pt-5 pb-5 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2 sm:hidden">
                              <span className="text-xs font-bold text-muted-foreground">
                                Étape {idx + 1}
                              </span>
                              {isCompleted && (
                                <CheckCircle2 className="h-3.5 w-3.5 text-[#7af17a]" />
                              )}
                            </div>
                            <h4 className="font-medium">{course.title}</h4>
                            {course.description && (
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {course.description}
                              </p>
                            )}
                          </div>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs flex-shrink-0",
                              prio.color
                            )}
                          >
                            {prio.label}
                          </Badge>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            {categoryIcons[course.skill]}
                            {course.skillLabel}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {course.estimatedMinutes} min
                          </span>
                          <span className="flex items-center gap-1">
                            <Circle
                              className={cn("h-2 w-2 fill-current", prio.dot)}
                            />
                            Priorité {prio.label.toLowerCase()}
                          </span>
                        </div>

                        {isStarted && (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>Progression</span>
                              <span>{course.progress}%</span>
                            </div>
                            <Progress
                              value={course.progress}
                              className="h-1.5"
                            />
                          </div>
                        )}

                        <Button
                          variant="outline"
                          size="sm"
                          className={cn(
                            "w-full sm:w-auto",
                            !isCompleted &&
                              "hover:bg-[#7af17a]/10 hover:text-[#7af17a] hover:border-[#7af17a]/30"
                          )}
                          asChild
                        >
                          <Link href={`/academy/${course.id}`}>
                            <BookOpen className="h-3.5 w-3.5 mr-2" />
                            {isCompleted
                              ? "Revoir"
                              : isStarted
                              ? "Continuer"
                              : "Commencer"}
                            <ArrowRight className="h-3.5 w-3.5 ml-2" />
                          </Link>
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <Card className="border-border/50">
          <CardContent className="pt-8 pb-8 text-center space-y-3">
            <BookOpen className="h-8 w-8 text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground">
              Aucun cours disponible pour le moment. De nouveaux contenus seront
              bientôt ajoutés.
            </p>
          </CardContent>
        </Card>
      )}

      {/* CTA to retake diagnostic */}
      <Card className="border-border/50 bg-card/50">
        <CardContent className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left">
            <h4 className="font-medium text-sm">
              Vous avez progressé ?
            </h4>
            <p className="text-xs text-muted-foreground mt-1">
              Refaites le diagnostic pour mettre à jour votre parcours
            </p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/academy/diagnostic">
              <Brain className="h-4 w-4 mr-2" />
              Refaire le diagnostic
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
