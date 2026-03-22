"use client";

import { useState, useTransition, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/layout/page-header";
import { cn } from "@/lib/utils";
import { submitDiagnosticResults } from "@/lib/actions/academy";
import {
  ArrowLeft,
  ArrowRight,
  Brain,
  Target,
  BookOpen,
  Compass,
  BarChart3,
  CheckCircle2,
  RotateCcw,
  Sparkles,
  Clock,
  Trophy,
} from "lucide-react";
import { toast } from "sonner";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

// ---------------------------------------------------------------------------
// Types (local, not exported from server file)
// ---------------------------------------------------------------------------

interface Question {
  id: string;
  category: string;
  categoryLabel: string;
  question: string;
  options: string[];
}

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

interface DiagnosticViewProps {
  questions: Question[];
  hasCompleted: boolean;
  existingSkills: SkillScore[];
  existingOverallScore: number;
  completedAt: string | null;
  recommendedCourses: RecommendedCourse[];
}

// ---------------------------------------------------------------------------
// Category icons
// ---------------------------------------------------------------------------

const categoryIcons: Record<string, React.ReactNode> = {
  prospection: <Target className="h-4 w-4" />,
  closing: <Trophy className="h-4 w-4" />,
  negociation: <BarChart3 className="h-4 w-4" />,
  communication: <Compass className="h-4 w-4" />,
  objection: <Brain className="h-4 w-4" />,
};

const levelColors: Record<string, string> = {
  Débutant: "text-red-400 bg-red-400/10 border-red-400/20",
  Intermédiaire: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  Avancé: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  Expert: "text-[#10b981] bg-[#10b981]/10 border-[#10b981]/20",
};

const priorityLabels: Record<string, { label: string; color: string }> = {
  haute: {
    label: "Priorité haute",
    color: "bg-red-500/20 text-red-400 border-red-500/30",
  },
  moyenne: {
    label: "Priorité moyenne",
    color: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  },
  basse: {
    label: "Priorité basse",
    color: "bg-green-500/20 text-green-400 border-green-500/30",
  },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DiagnosticView({
  questions,
  hasCompleted,
  existingSkills,
  existingOverallScore,
  completedAt,
  recommendedCourses,
}: DiagnosticViewProps) {
  const [mode, setMode] = useState<"quiz" | "results">(
    hasCompleted ? "results" : "quiz",
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [skills, setSkills] = useState<SkillScore[]>(existingSkills);
  const [overallScore, setOverallScore] = useState(existingOverallScore);
  const [courses, setCourses] =
    useState<RecommendedCourse[]>(recommendedCourses);
  const [resultCompletedAt, setResultCompletedAt] = useState<string | null>(
    completedAt,
  );
  const [isPending, startTransition] = useTransition();

  const currentQuestion = questions[currentIndex];
  const progressPercent = ((currentIndex + 1) / questions.length) * 100;
  const allAnswered = Object.keys(answers).length === questions.length;

  const handleSelectOption = useCallback(
    (option: string) => {
      setSelectedOption(option);
      setAnswers((prev) => ({
        ...prev,
        [currentQuestion.id]: option,
      }));
    },
    [currentQuestion],
  );

  const handleNext = useCallback(() => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOption(answers[questions[currentIndex + 1]?.id] || null);
    }
  }, [currentIndex, questions, answers]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setSelectedOption(answers[questions[currentIndex - 1]?.id] || null);
    }
  }, [currentIndex, questions, answers]);

  const handleSubmit = useCallback(() => {
    startTransition(async () => {
      try {
        const answerArray = Object.entries(answers).map(
          ([questionId, answer]) => ({
            questionId,
            answer,
          }),
        );
        const result = await submitDiagnosticResults(answerArray);
        setSkills(result.skills);
        setOverallScore(result.overallScore);
        setCourses(result.recommendedCourses);
        setResultCompletedAt(result.completedAt);
        setMode("results");
        toast.success("Diagnostic terminé !", {
          style: { background: "#09090b", borderColor: "#10b981" },
        });
      } catch {
        toast.error("Erreur lors de la soumission du diagnostic");
      }
    });
  }, [answers]);

  const handleRetake = useCallback(() => {
    setMode("quiz");
    setCurrentIndex(0);
    setAnswers({});
    setSelectedOption(null);
  }, []);

  // ---------------------------------------------------------------------------
  // Quiz mode
  // ---------------------------------------------------------------------------
  if (mode === "quiz") {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Diagnostic de compétences"
          description="Évaluez vos compétences commerciales en 10 questions"
        >
          <Button variant="outline" size="sm" asChild>
            <Link href="/academy">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Link>
          </Button>
        </PageHeader>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Question {currentIndex + 1} sur {questions.length}
            </span>
            <span>{Math.round(progressPercent)}%</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>

        {/* Category badge */}
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="gap-1.5 border-[#10b981]/30 text-[#10b981]"
          >
            {categoryIcons[currentQuestion.category]}
            {currentQuestion.categoryLabel}
          </Badge>
        </div>

        {/* Question card */}
        <Card className="border-border/50 bg-card/50">
          <CardContent className="pt-6 space-y-6">
            <h2 className="text-lg font-semibold leading-relaxed">
              {currentQuestion.question}
            </h2>

            <div className="space-y-3">
              {currentQuestion.options.map((option, idx) => {
                const isSelected = selectedOption === option;
                return (
                  <button
                    key={idx}
                    onClick={() => handleSelectOption(option)}
                    className={cn(
                      "w-full text-left p-4 rounded-lg border transition-all duration-200",
                      "hover:border-[#10b981]/50 hover:bg-[#10b981]/5",
                      isSelected
                        ? "border-[#10b981] bg-[#10b981]/10 text-foreground"
                        : "border-border/50 bg-background/50 text-muted-foreground",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={cn(
                          "flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-medium border",
                          isSelected
                            ? "bg-[#10b981] text-[#09090b] border-[#10b981]"
                            : "border-border/50 text-muted-foreground",
                        )}
                      >
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span className="pt-0.5">{option}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handlePrev}
            disabled={currentIndex === 0}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Précédent
          </Button>

          {currentIndex < questions.length - 1 ? (
            <Button
              onClick={handleNext}
              disabled={!selectedOption}
              className="bg-[#10b981] text-[#09090b] hover:bg-[#10b981]/90"
            >
              Suivant
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!allAnswered || isPending}
              className="bg-[#10b981] text-[#09090b] hover:bg-[#10b981]/90"
            >
              {isPending ? (
                "Analyse en cours..."
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Terminer le diagnostic
                </>
              )}
            </Button>
          )}
        </div>

        {/* Quick navigation dots */}
        <div className="flex items-center justify-center gap-1.5">
          {questions.map((q, idx) => (
            <button
              key={q.id}
              onClick={() => {
                setCurrentIndex(idx);
                setSelectedOption(answers[q.id] || null);
              }}
              className={cn(
                "w-2.5 h-2.5 rounded-full transition-all",
                idx === currentIndex
                  ? "bg-[#10b981] w-6"
                  : answers[q.id]
                    ? "bg-[#10b981]/50"
                    : "bg-border",
              )}
            />
          ))}
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Results mode
  // ---------------------------------------------------------------------------
  const radarData = skills.map((s) => ({
    subject: s.categoryLabel,
    score: s.score,
    fullMark: 100,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Résultats du diagnostic"
        description="Votre profil de compétences commerciales"
      >
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/academy">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Academy
            </Link>
          </Button>
          <Button variant="outline" size="sm" onClick={handleRetake}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Refaire le diagnostic
          </Button>
        </div>
      </PageHeader>

      {/* Overall score */}
      <Card className="border-[#10b981]/20 bg-gradient-to-br from-[#10b981]/5 to-transparent">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="relative">
              <div className="w-28 h-28 rounded-full border-4 border-[#10b981]/30 flex items-center justify-center">
                <div className="text-center">
                  <span className="text-3xl font-bold text-[#10b981]">
                    {overallScore}
                  </span>
                  <span className="text-sm text-muted-foreground block">
                    /100
                  </span>
                </div>
              </div>
            </div>
            <div className="text-center sm:text-left">
              <h2 className="text-xl font-semibold">Score global</h2>
              <p className="text-muted-foreground text-sm mt-1">
                {overallScore >= 80
                  ? "Excellent ! Vous maîtrisez les fondamentaux de la vente."
                  : overallScore >= 60
                    ? "Bon niveau. Quelques compétences sont à renforcer."
                    : overallScore >= 40
                      ? "Des bases solides, mais plusieurs axes d'amélioration identifiés."
                      : "Un parcours de formation personnalisé vous attend pour progresser rapidement."}
              </p>
              {resultCompletedAt && (
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Évalué le{" "}
                  {new Date(resultCompletedAt).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Radar chart */}
      <Card className="border-border/50">
        <CardContent className="pt-6">
          <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-[#10b981]" />
            Cartographie des compétences
          </h3>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                <PolarGrid stroke="#333" />
                <PolarAngleAxis
                  dataKey="subject"
                  tick={{ fill: "#999", fontSize: 12 }}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 100]}
                  tick={{ fill: "#666", fontSize: 10 }}
                />
                <Radar
                  name="Score"
                  dataKey="score"
                  stroke="#10b981"
                  fill="#10b981"
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
                <Tooltip
                  contentStyle={{
                    background: "#09090b",
                    border: "1px solid #333",
                    borderRadius: "8px",
                  }}
                  formatter={
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    ((value: number) => [`${value}/100`, "Score"]) as any
                  }
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Skill breakdown cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {skills.map((skill) => (
          <Card key={skill.category} className="border-border/50">
            <CardContent className="pt-6 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {categoryIcons[skill.category]}
                  <span className="font-medium text-sm">
                    {skill.categoryLabel}
                  </span>
                </div>
                <Badge
                  variant="outline"
                  className={cn("text-xs", levelColors[skill.level])}
                >
                  {skill.level}
                </Badge>
              </div>
              <Progress value={skill.score} className="h-2" />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {skill.correct}/{skill.total} correct
                  {skill.correct > 1 ? "es" : "e"}
                </span>
                <span className="font-semibold text-foreground">
                  {skill.score}%
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recommended courses */}
      {courses.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-base font-semibold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#10b981]" />
            Cours recommandés
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {courses.map((course) => {
              const prio =
                priorityLabels[course.priority] || priorityLabels.basse;
              return (
                <Card
                  key={course.id}
                  className="border-border/50 hover:border-[#10b981]/30 transition-colors"
                >
                  <CardContent className="pt-6 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-medium text-sm leading-tight">
                        {course.title}
                      </h4>
                      <Badge
                        variant="outline"
                        className={cn("text-xs flex-shrink-0", prio.color)}
                      >
                        {prio.label}
                      </Badge>
                    </div>
                    {course.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {course.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        {categoryIcons[course.skill]}
                        {course.skillLabel}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {course.estimatedMinutes} min
                      </span>
                    </div>
                    {typeof course.progress === "number" &&
                      course.progress > 0 && (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>Progression</span>
                            <span>{course.progress}%</span>
                          </div>
                          <Progress value={course.progress} className="h-1.5" />
                        </div>
                      )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-2"
                      asChild
                    >
                      <Link href={`/academy/${course.id}`}>
                        <BookOpen className="h-3.5 w-3.5 mr-2" />
                        {course.progress && course.progress > 0
                          ? "Continuer"
                          : "Commencer"}
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Link to full path */}
      <Card className="border-[#10b981]/20 bg-[#10b981]/5">
        <CardContent className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#10b981]/20 flex items-center justify-center">
              <Compass className="h-5 w-5 text-[#10b981]" />
            </div>
            <div>
              <h4 className="font-medium text-sm">
                Parcours d&apos;apprentissage personnalisé
              </h4>
              <p className="text-xs text-muted-foreground">
                Visualisez votre plan de formation adapté à votre niveau
              </p>
            </div>
          </div>
          <Button
            asChild
            className="bg-[#10b981] text-[#09090b] hover:bg-[#10b981]/90"
          >
            <Link href="/academy/path">
              Voir mon parcours
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
