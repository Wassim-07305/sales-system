"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { completeOnboardingStep } from "@/lib/actions/onboarding";
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
}

const typeIcons: Record<string, React.ReactNode> = {
  video: <Play className="h-4 w-4" />,
  action: <FileText className="h-4 w-4" />,
  booking: <Calendar className="h-4 w-4" />,
  questionnaire: <ClipboardList className="h-4 w-4" />,
};

export function OnboardingFlow({ steps, progressMap }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [expandedStep, setExpandedStep] = useState<string | null>(null);

  const completedCount = steps.filter((s) => progressMap[s.id]?.completed).length;
  const progressPercent = steps.length > 0 ? Math.round((completedCount / steps.length) * 100) : 0;

  // Find the first uncompleted step
  const currentStepIndex = steps.findIndex((s) => !progressMap[s.id]?.completed);

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

  function renderStepContent(step: Step) {
    const content = step.content as Record<string, unknown>;

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
      <PageHeader
        title="Onboarding"
        description="Bienvenue ! Suivez ces étapes pour bien démarrer."
      />

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
