"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { getDetailedQuizResults } from "@/lib/actions/academy";
import {
  CheckCircle,
  XCircle,
  ArrowLeft,
  ArrowRight,
  Trophy,
  BookOpen,
  AlertCircle,
} from "lucide-react";

interface QuizResult {
  score: number;
  passed: boolean;
  totalQuestions: number;
  correctCount: number;
  breakdown: Array<{
    question: string;
    options: string[];
    correctIndex: number;
    userAnswer: number;
    isCorrect: boolean;
    explanation: string | null;
  }>;
  attemptedAt: string;
  courseId?: string;
  nextLessonId?: string;
}

interface Props {
  attemptId: string;
  courseId?: string;
  nextLessonId?: string;
}

export function QuizResultsView({ attemptId, courseId, nextLessonId }: Props) {
  const [results, setResults] = useState<QuizResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [animatedScore, setAnimatedScore] = useState(0);
  const animationRef = useRef<number | null>(null);

  const animateScore = useCallback((target: number) => {
    const duration = 1000; // 1 second
    const startTime = performance.now();
    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedScore(Math.round(eased * target));
      if (progress < 1) {
        animationRef.current = requestAnimationFrame(tick);
      }
    }
    animationRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const data = await getDetailedQuizResults(attemptId);
        setResults(data as QuizResult | null);
      } catch {
        // silently ignore
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [attemptId]);

  useEffect(() => {
    if (results && !loading) {
      const target =
        results.totalQuestions > 0
          ? Math.round((results.correctCount / results.totalQuestions) * 100)
          : 0;
      animateScore(target);
    }
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [results, loading, animateScore]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 text-muted-foreground">
        Chargement des résultats…
      </div>
    );
  }

  if (!results) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Résultats du quiz"
          description="Impossible de charger les résultats"
        />
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Tentative introuvable ou accès refusé.</p>
            <Link href="/academy" className="mt-4 inline-block">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour à l&apos;Academy
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const scorePercent =
    results.totalQuestions > 0
      ? Math.round((results.correctCount / results.totalQuestions) * 100)
      : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Résultats du quiz"
        description="Détail question par question de votre tentative"
      />

      <Link href="/academy">
        <Button variant="ghost" size="sm" className="mb-2">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour à l&apos;Academy
        </Button>
      </Link>

      {/* Score overview */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div
              className={cn(
                "h-24 w-24 rounded-full flex items-center justify-center",
                results.passed
                  ? "bg-emerald-500/20 ring-2 ring-emerald-500/40"
                  : "bg-red-500/20 ring-2 ring-red-500/40",
              )}
            >
              {results.passed ? (
                <Trophy className="h-10 w-10 text-emerald-400" />
              ) : (
                <XCircle className="h-10 w-10 text-red-400" />
              )}
            </div>
            <div className="flex-1 text-center sm:text-left space-y-2">
              <div className="flex items-center gap-3 justify-center sm:justify-start">
                <h2 className="text-3xl font-bold tabular-nums">
                  {animatedScore}%
                </h2>
                <Badge
                  className={cn(
                    results.passed
                      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                      : "bg-red-500/20 text-red-400 border-red-500/30",
                  )}
                >
                  {results.passed ? "Réussi" : "Échoué"}
                </Badge>
              </div>
              <p
                className={cn(
                  "text-sm font-semibold transition-opacity duration-500",
                  animatedScore === scorePercent
                    ? "opacity-100"
                    : "opacity-0",
                  results.passed ? "text-emerald-400" : "text-amber-400",
                )}
              >
                {results.passed
                  ? "Bravo !"
                  : "Continuez, vous progressez !"}
              </p>
              <p className="text-muted-foreground">
                {results.correctCount} bonne
                {results.correctCount > 1 ? "s" : ""} réponse
                {results.correctCount > 1 ? "s" : ""} sur{" "}
                {results.totalQuestions} question
                {results.totalQuestions > 1 ? "s" : ""}
              </p>
              <Progress
                value={animatedScore}
                className={cn(
                  "h-3",
                  results.passed
                    ? "[&>div]:bg-emerald-500"
                    : "[&>div]:bg-red-500",
                )}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Next module CTA */}
      {results.passed && (
        <Card className="border-emerald-500/30 bg-gradient-to-r from-emerald-500/5 to-transparent">
          <CardContent className="py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-emerald-400">
                Module validé !
              </p>
              <p className="text-sm text-muted-foreground">
                Vous pouvez passer au module suivant.
              </p>
            </div>
            {nextLessonId && courseId ? (
              <Link
                href={`/academy/${courseId}?lesson=${nextLessonId}`}
              >
                <Button className="bg-emerald-500 text-black hover:bg-emerald-400 font-semibold">
                  Passer au module suivant
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            ) : (
              <Link href="/academy">
                <Button className="bg-emerald-500 text-black hover:bg-emerald-400 font-semibold">
                  Retour à l&apos;Academy
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      )}

      {/* Question breakdown */}
      <div className="space-y-4">
        {results.breakdown.map((q, idx) => (
          <Card key={idx}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                {q.isCorrect ? (
                  <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-400 shrink-0" />
                )}
                <span>
                  Question {idx + 1}: {q.question}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {q.options.map((opt, optIdx) => {
                const isUserAnswer = optIdx === q.userAnswer;
                const isCorrectAnswer = optIdx === q.correctIndex;

                return (
                  <div
                    key={optIdx}
                    className={cn(
                      "px-4 py-2.5 rounded-lg border text-sm flex items-center gap-2",
                      isCorrectAnswer &&
                        "border-emerald-500/50 bg-emerald-500/10 text-emerald-300",
                      isUserAnswer &&
                        !isCorrectAnswer &&
                        "border-red-500/50 bg-red-500/10 text-red-300",
                      !isUserAnswer &&
                        !isCorrectAnswer &&
                        "border-border/50 text-muted-foreground",
                    )}
                  >
                    {isCorrectAnswer && (
                      <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
                    )}
                    {isUserAnswer && !isCorrectAnswer && (
                      <XCircle className="h-4 w-4 text-red-400 shrink-0" />
                    )}
                    <span>{opt}</span>
                    {isUserAnswer && !isCorrectAnswer && (
                      <Badge
                        variant="outline"
                        className="ml-auto text-xs text-red-400 border-red-500/30"
                      >
                        Votre réponse
                      </Badge>
                    )}
                    {isCorrectAnswer && (
                      <Badge
                        variant="outline"
                        className="ml-auto text-xs text-emerald-400 border-emerald-500/30"
                      >
                        Bonne réponse
                      </Badge>
                    )}
                  </div>
                );
              })}
              {q.explanation && (
                <div className="mt-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <p className="text-sm text-blue-300 flex items-start gap-2">
                    <BookOpen className="h-4 w-4 mt-0.5 shrink-0" />
                    {q.explanation}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* CTA */}
      {!results.passed && (
        <Card>
          <CardContent className="py-6 text-center">
            <p className="text-muted-foreground mb-4">
              Vous n&apos;avez pas atteint le score minimum. Révisez le module
              et réessayez !
            </p>
            <Link href="/academy">
              <Button>
                <BookOpen className="h-4 w-4 mr-2" />
                Réviser le module
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
