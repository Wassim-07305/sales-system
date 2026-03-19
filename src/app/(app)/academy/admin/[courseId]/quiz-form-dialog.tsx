"use client";

import { useState, useEffect } from "react";
import { Loader2, Plus, Trash2, GripVertical, Check } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

import {
  createQuiz,
  updateQuiz,
  deleteQuiz,
} from "@/lib/actions/academy-admin";

import type { Quiz } from "@/lib/types/database";

// ─── Types ───────────────────────────────────────────────────

interface QuizQuestion {
  question: string;
  options: string[];
  correct_index: number;
}

interface QuizFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lessonId: string;
  existingQuiz: Quiz | null;
  onSaved: (quiz: Quiz | null) => void;
}

// ─── Composant principal ─────────────────────────────────────

export function QuizFormDialog({
  open,
  onOpenChange,
  lessonId,
  existingQuiz,
  onSaved,
}: QuizFormDialogProps) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [maxAttempts, setMaxAttempts] = useState(3);
  const [passingScore, setPassingScore] = useState(90);
  const [randomize, setRandomize] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Initialise le formulaire quand le dialog s'ouvre
  useEffect(() => {
    if (open) {
      if (existingQuiz) {
        setQuestions(
          existingQuiz.questions.map((q) => ({
            question: q.question,
            options: [...q.options],
            correct_index: q.correct_index,
          })),
        );
        setMaxAttempts(existingQuiz.max_attempts_per_day);
        setPassingScore(existingQuiz.passing_score);
        setRandomize(existingQuiz.randomize);
      } else {
        setQuestions([emptyQuestion()]);
        setMaxAttempts(3);
        setPassingScore(90);
        setRandomize(true);
      }
    }
  }, [open, existingQuiz]);

  function emptyQuestion(): QuizQuestion {
    return { question: "", options: ["", "", "", ""], correct_index: 0 };
  }

  const addQuestion = () => {
    setQuestions((prev) => [...prev, emptyQuestion()]);
  };

  const removeQuestion = (index: number) => {
    if (questions.length <= 1) {
      toast.error("Le quiz doit contenir au moins une question");
      return;
    }
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const updateQuestion = (index: number, field: string, value: string) => {
    setQuestions((prev) =>
      prev.map((q, i) => (i === index ? { ...q, [field]: value } : q)),
    );
  };

  const updateOption = (qIndex: number, oIndex: number, value: string) => {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIndex
          ? {
              ...q,
              options: q.options.map((o, j) => (j === oIndex ? value : o)),
            }
          : q,
      ),
    );
  };

  const setCorrectAnswer = (qIndex: number, oIndex: number) => {
    setQuestions((prev) =>
      prev.map((q, i) => (i === qIndex ? { ...q, correct_index: oIndex } : q)),
    );
  };

  const validate = (): boolean => {
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question.trim()) {
        toast.error(`Question ${i + 1} : le texte est vide`);
        return false;
      }
      const filledOptions = q.options.filter((o) => o.trim());
      if (filledOptions.length < 2) {
        toast.error(`Question ${i + 1} : au moins 2 options sont requises`);
        return false;
      }
      if (!q.options[q.correct_index]?.trim()) {
        toast.error(
          `Question ${i + 1} : la bonne réponse ne peut pas être vide`,
        );
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    // Nettoyer les options vides
    const cleanedQuestions = questions.map((q) => {
      const filledOptions = q.options.map((o) => o.trim()).filter(Boolean);
      let correctIndex = q.correct_index;
      // Re-map correct_index apres suppression des options vides
      const originalCorrectText = q.options[q.correct_index]?.trim();
      if (originalCorrectText) {
        const newIdx = filledOptions.indexOf(originalCorrectText);
        if (newIdx !== -1) correctIndex = newIdx;
      }
      return {
        question: q.question.trim(),
        options: filledOptions,
        correct_index: correctIndex,
      };
    });

    setSaving(true);
    try {
      if (existingQuiz) {
        await updateQuiz(existingQuiz.id, {
          questions: cleanedQuestions,
          max_attempts_per_day: maxAttempts,
          passing_score: passingScore,
          randomize,
        });
        onSaved({
          ...existingQuiz,
          questions: cleanedQuestions,
          max_attempts_per_day: maxAttempts,
          passing_score: passingScore,
          randomize,
        });
        toast.success("Quiz mis a jour");
      } else {
        const quiz = await createQuiz({
          lesson_id: lessonId,
          questions: cleanedQuestions,
          max_attempts_per_day: maxAttempts,
          passing_score: passingScore,
          randomize,
        });
        onSaved(quiz);
        toast.success("Quiz cree");
      }
      onOpenChange(false);
    } catch {
      toast.error("Erreur lors de la sauvegarde du quiz");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!existingQuiz) return;
    if (
      !confirm(
        "Supprimer ce quiz ? Les tentatives existantes seront conservees.",
      )
    )
      return;

    setDeleting(true);
    try {
      await deleteQuiz(existingQuiz.id);
      onSaved(null);
      toast.success("Quiz supprime");
      onOpenChange(false);
    } catch {
      toast.error("Erreur lors de la suppression du quiz");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {existingQuiz ? "Modifier le quiz" : "Creer un quiz"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Parametres generaux */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="max-attempts">Tentatives / jour</Label>
              <Input
                id="max-attempts"
                type="number"
                min={1}
                max={10}
                value={maxAttempts}
                onChange={(e) => setMaxAttempts(parseInt(e.target.value) || 3)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="passing-score">Score min. (%)</Label>
              <Input
                id="passing-score"
                type="number"
                min={1}
                max={100}
                value={passingScore}
                onChange={(e) =>
                  setPassingScore(parseInt(e.target.value) || 90)
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Ordre aleatoire</Label>
              <div className="flex items-center h-10">
                <Switch checked={randomize} onCheckedChange={setRandomize} />
              </div>
            </div>
          </div>

          {/* Questions */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">
                Questions ({questions.length})
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addQuestion}
              >
                <Plus className="h-4 w-4 mr-1" />
                Ajouter
              </Button>
            </div>

            {questions.map((q, qIdx) => (
              <div
                key={qIdx}
                className="rounded-lg border p-4 space-y-3 bg-muted/20"
              >
                <div className="flex items-start gap-2">
                  <GripVertical className="h-5 w-5 text-muted-foreground shrink-0 mt-2" />
                  <div className="flex-1 space-y-3">
                    {/* Question text */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-muted-foreground shrink-0">
                        Q{qIdx + 1}
                      </span>
                      <Input
                        value={q.question}
                        onChange={(e) =>
                          updateQuestion(qIdx, "question", e.target.value)
                        }
                        placeholder="Saisissez la question..."
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeQuestion(qIdx)}
                        className="text-muted-foreground hover:text-destructive shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Options (4 choix) */}
                    <div className="grid grid-cols-1 gap-2 pl-7">
                      {q.options.map((opt, oIdx) => (
                        <div key={oIdx} className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setCorrectAnswer(qIdx, oIdx)}
                            className={cn(
                              "shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-colors",
                              q.correct_index === oIdx
                                ? "border-brand bg-brand text-brand-dark"
                                : "border-muted-foreground/30 hover:border-brand/50",
                            )}
                          >
                            {q.correct_index === oIdx && (
                              <Check className="h-4 w-4" />
                            )}
                          </button>
                          <Input
                            value={opt}
                            onChange={(e) =>
                              updateOption(qIdx, oIdx, e.target.value)
                            }
                            placeholder={`Option ${oIdx + 1}`}
                            className={cn(
                              "flex-1",
                              q.correct_index === oIdx &&
                                "border-brand/50 bg-brand/5",
                            )}
                          />
                        </div>
                      ))}
                    </div>

                    <p className="text-xs text-muted-foreground pl-7">
                      Cliquez sur le cercle pour indiquer la bonne réponse
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            {existingQuiz && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={deleting || saving}
                className="mr-auto"
              >
                {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Supprimer le quiz
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving || deleting}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={saving || deleting || questions.length === 0}
              className="bg-brand text-brand-dark hover:bg-brand/90"
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {existingQuiz ? "Mettre a jour" : "Creer le quiz"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
