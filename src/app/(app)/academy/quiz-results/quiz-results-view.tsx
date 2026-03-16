"use client";

import { useState, useEffect } from "react";
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
}

interface Props {
  attemptId: string;
}

export function QuizResultsView({ attemptId }: Props) {
  const [results, setResults] = useState<QuizResult | null>(null);
  const [loading, setLoading] = useState(true);

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
                <h2 className="text-3xl font-bold">{scorePercent}%</h2>
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
              <p className="text-muted-foreground">
                {results.correctCount} bonne
                {results.correctCount > 1 ? "s" : ""} réponse
                {results.correctCount > 1 ? "s" : ""} sur{" "}
                {results.totalQuestions} question
                {results.totalQuestions > 1 ? "s" : ""}
              </p>
              <Progress
                value={scorePercent}
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
