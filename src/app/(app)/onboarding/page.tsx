"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  Circle,
  Play,
  FileText,
  Calendar,
  ArrowRight,
} from "lucide-react";

const steps = [
  {
    title: "Bienvenue chez Sales System",
    description: "Regardez la vidéo de bienvenue de Damien.",
    type: "video",
    completed: true,
  },
  {
    title: "Complétez votre profil",
    description: "Renseignez vos informations et objectifs.",
    type: "action",
    completed: true,
  },
  {
    title: "Regardez le module introduction",
    description: "Découvrez la méthode Sales System en 15 minutes.",
    type: "video",
    completed: false,
  },
  {
    title: "Bookez votre premier call",
    description: "Planifiez votre premier appel de coaching.",
    type: "booking",
    completed: false,
  },
  {
    title: "Rejoignez la communauté",
    description: "Présentez-vous dans le channel #bienvenue.",
    type: "action",
    completed: false,
  },
];

const typeIcons: Record<string, React.ReactNode> = {
  video: <Play className="h-4 w-4" />,
  action: <FileText className="h-4 w-4" />,
  booking: <Calendar className="h-4 w-4" />,
};

export default function OnboardingPage() {
  const [currentStep] = useState(2); // 0-indexed
  const completedCount = steps.filter((s) => s.completed).length;
  const progress = Math.round((completedCount / steps.length) * 100);

  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader
        title="Onboarding"
        description="Bienvenue ! Suivez ces étapes pour bien démarrer."
      />

      {/* Progress */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Progression</h3>
            <span className="text-sm font-medium">{progress}%</span>
          </div>
          <Progress value={progress} className="h-3 mb-2" />
          <p className="text-xs text-muted-foreground">
            {completedCount}/{steps.length} étapes complétées
          </p>
        </CardContent>
      </Card>

      {/* Steps */}
      <div className="space-y-3">
        {steps.map((step, i) => {
          const isCurrent = i === currentStep;
          return (
            <Card
              key={i}
              className={cn(
                "transition-all",
                isCurrent && "ring-2 ring-brand",
                step.completed && "opacity-70"
              )}
            >
              <CardContent className="p-5 flex items-center gap-4">
                <div className="shrink-0">
                  {step.completed ? (
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
                    {typeIcons[step.type]}
                    <h4 className="font-medium text-sm">{step.title}</h4>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {step.description}
                  </p>
                </div>
                {isCurrent && (
                  <Button
                    size="sm"
                    className="bg-brand text-brand-dark hover:bg-brand/90 shrink-0"
                  >
                    Commencer
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
