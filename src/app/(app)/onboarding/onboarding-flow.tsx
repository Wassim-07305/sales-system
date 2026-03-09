"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { completeOnboardingStep, submitOnboardingQuiz } from "@/lib/actions/onboarding";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Circle,
  Play,
  FileText,
  Calendar,
  ArrowRight,
  ClipboardList,
  Loader2,
  Brain,
  Trophy,
  Sparkles,
  PartyPopper,
} from "lucide-react";

interface Step {
  id: string;
  title: string;
  description: string | null;
  position: number;
  step_type: string;
  content: Record<string, unknown>;
  is_required: boolean;
}

interface Props {
  steps: Step[];
  progressMap: Record<string, { completed: boolean; response_data: Record<string, unknown> }>;
  quizResult?: { score: number; color_code: string } | null;
}

const typeIcons: Record<string, React.ReactNode> = {
  video: <Play className="h-4 w-4" />,
  action: <FileText className="h-4 w-4" />,
  booking: <Calendar className="h-4 w-4" />,
  questionnaire: <ClipboardList className="h-4 w-4" />,
  quiz: <Brain className="h-4 w-4" />,
};

const colorCodeLabels: Record<string, { label: string; className: string }> = {
  green: { label: "Excellent", className: "bg-green-500 text-white" },
  orange: { label: "Bon potentiel", className: "bg-orange-500 text-white" },
  red: { label: "En progression", className: "bg-red-500 text-white" },
};

export function OnboardingFlow({ steps, progressMap, quizResult }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [expandedStep, setExpandedStep] = useState<string | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState<{ score: number; colorCode: string } | null>(
    quizResult ? { score: quizResult.score, colorCode: quizResult.color_code } : null
  );
  const [showConfetti, setShowConfetti] = useState(false);

  const completedCount = steps.filter((s) => progressMap[s.id]?.completed).length;
  const progressPercent = steps.length > 0 ? Math.round((completedCount / steps.length) * 100) : 0;

  // Find the first uncompleted step
  const currentStepIndex = steps.findIndex((s) => !progressMap[s.id]?.completed);
  const allCompleted = currentStepIndex === -1 && steps.length > 0;

  // Trigger confetti when all completed
  if (allCompleted && !showConfetti) {
    setShowConfetti(true);
  }

  async function handleComplete(step: Step) {
    setLoading(step.id);
    try {
      const responseData = step.step_type === "questionnaire" ? formData : {};
      await completeOnboardingStep(step.id, responseData);
      toast.success(`${step.title} — Complété !`);
      setExpandedStep(null);
      router.refresh();
    } catch {
      toast.error("Erreur lors de la validation");
    } finally {
      setLoading(null);
    }
  }

  async function handleQuizSubmit(step: Step) {
    setLoading(step.id);
    try {
      const questions = (step.content.quiz_questions as Array<{
        question: string;
        options: string[];
        correct_index: number;
      }>) || [];

      // Convert quiz answers to text for scoring
      const textAnswers: Record<string, string> = {};
      questions.forEach((q, i) => {
        const selectedIndex = quizAnswers[`q_${i}`];
        if (selectedIndex !== undefined) {
          textAnswers[`q_${i}`] = q.options[selectedIndex] || "";
        }
      });

      // Calculate correct answers score
      let correctCount = 0;
      questions.forEach((q, i) => {
        if (quizAnswers[`q_${i}`] === q.correct_index) {
          correctCount++;
        }
      });

      const score = questions.length > 0
        ? Math.round((correctCount / questions.length) * 100)
        : 0;

      const result = await submitOnboardingQuiz(textAnswers);
      // Use the actual correct-answer score for display
      const colorCode = score >= 80 ? "green" : score >= 50 ? "orange" : "red";
      setQuizScore({ score, colorCode });
      setQuizSubmitted(true);

      // Also mark the onboarding step as completed
      await completeOnboardingStep(step.id, { quiz_score: score, color_code: colorCode });

      toast.success(`Quiz terminé ! Score : ${score}%`);
      router.refresh();
    } catch {
      toast.error("Erreur lors de la soumission du quiz");
    } finally {
      setLoading(null);
    }
  }

  function renderQuizContent(step: Step) {
    const questions = (step.content.quiz_questions as Array<{
      question: string;
      options: string[];
      correct_index: number;
    }>) || [];

    if (quizSubmitted && quizScore) {
      const colorInfo = colorCodeLabels[quizScore.colorCode] || colorCodeLabels.orange;
      return (
        <div className="space-y-4">
          <div className="text-center py-6">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-brand/10 mb-4">
              <Trophy className="h-10 w-10 text-brand" />
            </div>
            <h3 className="text-xl font-bold mb-2">Quiz terminé !</h3>
            <div className="flex items-center justify-center gap-3 mb-3">
              <span className="text-3xl font-bold">{quizScore.score}%</span>
              <Badge className={cn("text-sm px-3 py-1", colorInfo.className)}>
                {colorInfo.label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {quizScore.colorCode === "green"
                ? "Félicitations ! Vous maîtrisez déjà les fondamentaux."
                : quizScore.colorCode === "orange"
                  ? "Bon début ! Quelques points à approfondir pour exceller."
                  : "Pas de souci, la formation va vous aider à progresser rapidement."}
            </p>
          </div>
          <div className="flex justify-center">
            <Button
              className="bg-brand text-brand-dark hover:bg-brand/90"
              onClick={() => {
                setExpandedStep(null);
              }}
            >
              Continuer
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      );
    }

    const allAnswered = questions.every((_, i) => quizAnswers[`q_${i}`] !== undefined);

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Brain className="h-4 w-4" />
          <span>{questions.length} questions — Choisissez la meilleure réponse</span>
        </div>

        {questions.map((q, qIndex) => (
          <div key={qIndex} className="space-y-2">
            <p className="font-medium text-sm">
              {qIndex + 1}. {q.question}
            </p>
            <div className="grid gap-2">
              {q.options.map((option, oIndex) => {
                const isSelected = quizAnswers[`q_${qIndex}`] === oIndex;
                return (
                  <button
                    key={oIndex}
                    type="button"
                    className={cn(
                      "w-full text-left px-4 py-3 rounded-lg border text-sm transition-all",
                      isSelected
                        ? "border-brand bg-brand/10 font-medium"
                        : "border-border hover:border-brand/50 hover:bg-brand/5"
                    )}
                    onClick={() =>
                      setQuizAnswers((prev) => ({
                        ...prev,
                        [`q_${qIndex}`]: oIndex,
                      }))
                    }
                  >
                    <span className="inline-flex items-center gap-2">
                      <span
                        className={cn(
                          "inline-flex items-center justify-center w-6 h-6 rounded-full border text-xs font-medium shrink-0",
                          isSelected
                            ? "border-brand bg-brand text-brand-dark"
                            : "border-muted-foreground/30"
                        )}
                      >
                        {String.fromCharCode(65 + oIndex)}
                      </span>
                      {option}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        <div className="pt-2">
          <Button
            className="bg-brand text-brand-dark hover:bg-brand/90 w-full"
            onClick={() => handleQuizSubmit(step)}
            disabled={!allAnswered || loading === step.id}
          >
            {loading === step.id && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Valider le quiz ({Object.keys(quizAnswers).length}/{questions.length} répondu{questions.length > 1 ? "es" : "e"})
          </Button>
          {!allAnswered && (
            <p className="text-xs text-muted-foreground text-center mt-2">
              Répondez à toutes les questions pour valider
            </p>
          )}
        </div>
      </div>
    );
  }

  function renderStepContent(step: Step) {
    const content = step.content as Record<string, unknown>;

    if (step.step_type === "quiz") {
      return renderQuizContent(step);
    }

    if (step.step_type === "video") {
      const videoUrl = (content.video_url as string) || "";
      return (
        <div className="space-y-3">
          {videoUrl && (
            <div className="aspect-video bg-black/5 rounded-lg flex items-center justify-center border">
              <div className="text-center text-muted-foreground">
                <Play className="h-8 w-8 mx-auto mb-2" />
                <p className="text-sm">Vidéo de bienvenue</p>
                <p className="text-xs">{(content.duration as string) || ""}</p>
              </div>
            </div>
          )}
          <Button
            className="bg-brand text-brand-dark hover:bg-brand/90"
            onClick={() => handleComplete(step)}
            disabled={loading === step.id}
          >
            {loading === step.id && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            J&apos;ai regardé la vidéo
          </Button>
        </div>
      );
    }

    if (step.step_type === "questionnaire") {
      const questions = (content.questions as Array<{
        key: string;
        label: string;
        type: string;
        options?: string[];
      }>) || [];

      return (
        <div className="space-y-4">
          {questions.map((q) => (
            <div key={q.key}>
              <Label className="text-sm">{q.label}</Label>
              {q.type === "textarea" ? (
                <Textarea
                  value={formData[q.key] || ""}
                  onChange={(e) => setFormData({ ...formData, [q.key]: e.target.value })}
                  placeholder="Votre réponse..."
                  className="mt-1"
                />
              ) : q.type === "select" && q.options ? (
                <Select
                  value={formData[q.key] || ""}
                  onValueChange={(v) => setFormData({ ...formData, [q.key]: v })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Sélectionner..." />
                  </SelectTrigger>
                  <SelectContent>
                    {q.options.map((opt) => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={formData[q.key] || ""}
                  onChange={(e) => setFormData({ ...formData, [q.key]: e.target.value })}
                  placeholder="Votre réponse..."
                  className="mt-1"
                />
              )}
            </div>
          ))}
          <Button
            className="bg-brand text-brand-dark hover:bg-brand/90"
            onClick={() => handleComplete(step)}
            disabled={loading === step.id}
          >
            {loading === step.id && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Valider mes réponses
          </Button>
        </div>
      );
    }

    // action or booking
    const actionUrl = (content.action_url as string) || "";
    const actionLabel = (content.action_label as string) || "Continuer";

    return (
      <div className="flex gap-3">
        {actionUrl && (
          <Button
            variant="outline"
            onClick={() => router.push(actionUrl)}
          >
            {actionLabel}
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        )}
        <Button
          className="bg-brand text-brand-dark hover:bg-brand/90"
          onClick={() => handleComplete(step)}
          disabled={loading === step.id}
        >
          {loading === step.id && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Marquer comme fait
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Confetti animation when all steps completed */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {Array.from({ length: 40 }).map((_, i) => (
            <div
              key={i}
              className="absolute animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 3}s`,
              }}
            >
              <div
                className="w-2 h-2 rounded-sm"
                style={{
                  backgroundColor: ["#7af17a", "#14080e", "#f59e0b", "#3b82f6", "#ef4444", "#a855f7"][
                    Math.floor(Math.random() * 6)
                  ],
                  transform: `rotate(${Math.random() * 360}deg)`,
                }}
              />
            </div>
          ))}
          <style jsx>{`
            @keyframes confetti-fall {
              0% {
                transform: translateY(-10vh) rotate(0deg);
                opacity: 1;
              }
              100% {
                transform: translateY(110vh) rotate(720deg);
                opacity: 0;
              }
            }
            .animate-confetti {
              animation: confetti-fall linear forwards;
            }
          `}</style>
        </div>
      )}

      <PageHeader
        title="Onboarding"
        description="Bienvenue ! Suivez ces étapes pour bien démarrer."
      />

      {/* Quiz score badge at top if available */}
      {(quizResult || quizScore) && (
        <Card className="mb-4 border-brand/30 bg-brand/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-brand/20">
                  <Trophy className="h-5 w-5 text-brand" />
                </div>
                <div>
                  <p className="text-sm font-medium">Résultat du quiz</p>
                  <p className="text-xs text-muted-foreground">
                    Votre niveau a été évalué
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">
                  {quizScore?.score ?? quizResult?.score}%
                </span>
                <Badge
                  className={cn(
                    "text-xs",
                    colorCodeLabels[quizScore?.colorCode ?? quizResult?.color_code ?? "orange"]?.className
                  )}
                >
                  {colorCodeLabels[quizScore?.colorCode ?? quizResult?.color_code ?? "orange"]?.label}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Progression</h3>
            <span className="text-sm font-medium">{progressPercent}%</span>
          </div>
          <Progress value={progressPercent} className="h-3 mb-2" />
          <p className="text-xs text-muted-foreground">
            {completedCount}/{steps.length} étapes complétées
          </p>
        </CardContent>
      </Card>

      {/* All steps completed celebration */}
      {allCompleted && (
        <Card className="mb-6 border-brand bg-gradient-to-r from-brand/10 to-brand/5">
          <CardContent className="p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-brand/20 mb-4">
              <PartyPopper className="h-8 w-8 text-brand" />
            </div>
            <h3 className="text-xl font-bold mb-2">Bravo, onboarding terminé !</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
              Vous avez complété toutes les étapes. Vous êtes prêt à démarrer !
            </p>
            <div className="flex gap-3 justify-center">
              <Button
                className="bg-brand text-brand-dark hover:bg-brand/90"
                onClick={() => router.push("/onboarding/welcome-pack")}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Voir mon Welcome Pack
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push("/dashboard")}
              >
                Aller au dashboard
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {steps.map((step, i) => {
          const isCompleted = progressMap[step.id]?.completed;
          const isCurrent = i === currentStepIndex;
          const isExpanded = expandedStep === step.id || (isCurrent && expandedStep === null);

          return (
            <Card
              key={step.id}
              className={cn(
                "transition-all cursor-pointer",
                isCurrent && "ring-2 ring-brand",
                isCompleted && "opacity-70"
              )}
              onClick={() => !isCompleted && setExpandedStep(step.id)}
            >
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className="shrink-0">
                    {isCompleted ? (
                      <CheckCircle2 className="h-6 w-6 text-brand" />
                    ) : isCurrent ? (
                      <div className="h-6 w-6 rounded-full border-2 border-brand flex items-center justify-center">
                        <div className="h-2.5 w-2.5 rounded-full bg-brand" />
                      </div>
                    ) : (
                      <Circle className="h-6 w-6 text-muted-foreground/30" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      {typeIcons[step.step_type]}
                      <h4 className="font-medium text-sm">{step.title}</h4>
                      {step.step_type === "quiz" && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          Quiz
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {step.description}
                    </p>
                  </div>
                  {isCurrent && !isExpanded && (
                    <Button
                      size="sm"
                      className="bg-brand text-brand-dark hover:bg-brand/90 shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedStep(step.id);
                      }}
                    >
                      Commencer
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  )}
                </div>

                {isExpanded && !isCompleted && (
                  <div className="mt-4 pt-4 border-t" onClick={(e) => e.stopPropagation()}>
                    {renderStepContent(step)}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {steps.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            Aucune étape d&apos;onboarding configurée.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
