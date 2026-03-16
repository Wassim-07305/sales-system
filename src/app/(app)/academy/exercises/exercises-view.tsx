"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  BookOpen,
  Send,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  FileText,
} from "lucide-react";
import { submitExercise, type ExerciseResult } from "@/lib/actions/academy";

interface Exercise {
  id: string;
  lessonTitle: string;
  courseTitle: string;
  prompt: string;
}

interface Props {
  exercises: Exercise[];
}

export function ExercisesView({ exercises }: Props) {
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(
    exercises[0] || null,
  );
  const [submission, setSubmission] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ExerciseResult | null>(null);

  // Get unique course titles for filtering
  const courseFilter = [
    ...new Set(exercises.map((e) => e.courseTitle).filter(Boolean)),
  ];
  const [filterCourse, setFilterCourse] = useState<string>("all");

  const filteredExercises =
    filterCourse === "all"
      ? exercises
      : exercises.filter((e) => e.courseTitle === filterCourse);

  async function handleSubmit() {
    if (!selectedExercise) {
      toast.error("Sélectionnez un exercice");
      return;
    }
    if (submission.trim().length < 20) {
      toast.error("Votre réponse doit contenir au moins 20 caractères.");
      return;
    }

    setSubmitting(true);
    setResult(null);
    try {
      const res = await submitExercise(selectedExercise.id, submission);
      setResult(res);
      if (res.score > 0) {
        toast.success(`Score obtenu : ${res.score}/100`);
      } else {
        toast.error("Correction indisponible — réessayez.");
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Erreur lors de la soumission",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function scoreColor(score: number) {
    if (score >= 75) return "text-brand";
    if (score >= 50) return "text-amber-500";
    return "text-red-500";
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Exercices Pratiques"
        description="Entraînez-vous avec des exercices corrigés par l'IA"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Exercise list */}
        <div className="space-y-4">
          {courseFilter.length > 1 && (
            <Select value={filterCourse} onValueChange={setFilterCourse}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Filtrer par cours" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les cours</SelectItem>
                {courseFilter.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {filteredExercises.length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Aucun exercice disponible.
              </p>
            )}
            {filteredExercises.map((ex) => (
              <Card
                key={ex.id}
                className={`cursor-pointer transition-shadow hover:shadow-md rounded-2xl ${
                  selectedExercise?.id === ex.id
                    ? "ring-2 ring-brand shadow-md"
                    : ""
                }`}
                onClick={() => {
                  setSelectedExercise(ex);
                  setResult(null);
                  setSubmission("");
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="h-9 w-9 rounded-lg bg-brand/10 flex items-center justify-center shrink-0 mt-0.5">
                      <BookOpen className="h-4 w-4 text-brand" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm leading-tight truncate">
                        {ex.lessonTitle}
                      </p>
                      {ex.courseTitle && (
                        <Badge variant="outline" className="text-[10px] mt-1.5">
                          {ex.courseTitle}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Right: Exercise workspace */}
        <div className="lg:col-span-2 space-y-4">
          {selectedExercise ? (
            <>
              {/* Prompt */}
              <Card className="rounded-2xl shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileText className="h-4 w-4 text-brand" />
                    Consigne
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {selectedExercise.prompt}
                  </p>
                </CardContent>
              </Card>

              {/* Submission area */}
              <Card className="rounded-2xl shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Votre réponse</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    placeholder="Rédigez votre réponse ici (minimum 20 caractères)..."
                    value={submission}
                    onChange={(e) => setSubmission(e.target.value)}
                    rows={6}
                    className="resize-none rounded-xl"
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {submission.length} caractère
                      {submission.length !== 1 ? "s" : ""}
                    </span>
                    <Button
                      onClick={handleSubmit}
                      disabled={submitting || submission.trim().length < 20}
                      className="rounded-xl font-medium bg-brand text-brand-dark hover:bg-brand/90"
                    >
                      {submitting ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4 mr-2" />
                      )}
                      Soumettre à l&apos;IA
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Result */}
              {result && result.score > 0 && (
                <Card className="rounded-2xl shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Sparkles className="h-4 w-4 text-brand" />
                      Correction IA
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    {/* Score */}
                    <div className="flex items-center gap-4">
                      <div className="relative h-20 w-20">
                        <svg
                          className="h-20 w-20 -rotate-90"
                          viewBox="0 0 36 36"
                        >
                          <path
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            className="text-muted/30"
                          />
                          <path
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeDasharray={`${result.score}, 100`}
                            className={scoreColor(result.score)}
                          />
                        </svg>
                        <span
                          className={`absolute inset-0 flex items-center justify-center text-lg font-bold ${scoreColor(result.score)}`}
                        >
                          {result.score}
                        </span>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm leading-relaxed">
                          {result.feedback}
                        </p>
                        <Progress value={result.score} className="mt-2 h-2" />
                      </div>
                    </div>

                    {/* Strengths */}
                    {result.strengths.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-2 flex items-center gap-1.5">
                          <CheckCircle2 className="h-4 w-4 text-brand" />
                          Points forts
                        </p>
                        <div className="space-y-1.5">
                          {result.strengths.map((s, i) => (
                            <div
                              key={i}
                              className="flex items-start gap-2 text-sm"
                            >
                              <span className="text-brand mt-0.5">+</span>
                              <span>{s}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Improvements */}
                    {result.improvements.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-2 flex items-center gap-1.5">
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                          Axes d&apos;amélioration
                        </p>
                        <div className="space-y-1.5">
                          {result.improvements.map((imp, i) => (
                            <div
                              key={i}
                              className="flex items-start gap-2 text-sm"
                            >
                              <span className="text-amber-500 mt-0.5">~</span>
                              <span>{imp}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Corrected version */}
                    {result.correctedVersion && (
                      <div>
                        <p className="text-sm font-medium mb-2">
                          Version améliorée
                        </p>
                        <Card className="bg-brand/5 border-brand/20">
                          <CardContent className="p-4">
                            <p className="text-sm whitespace-pre-wrap leading-relaxed">
                              {result.correctedVersion}
                            </p>
                          </CardContent>
                        </Card>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Error fallback */}
              {result && result.score === 0 && (
                <Card className="rounded-2xl border-amber-500/30">
                  <CardContent className="p-5 text-center">
                    <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      {result.feedback}
                    </p>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card className="rounded-2xl shadow-sm">
              <CardContent className="p-12 text-center">
                <BookOpen className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">
                  Sélectionnez un exercice pour commencer.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
