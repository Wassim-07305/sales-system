"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, X, StickyNote } from "lucide-react";
import type { Presentation, PresentationSlide } from "@/lib/types/database";
import { SlideRenderer } from "@/components/genspark/slide-renderer";
import { cn } from "@/lib/utils";

interface PresentViewProps {
  presentation: Presentation;
  slides: PresentationSlide[];
}

export function PresentView({ presentation, slides }: PresentViewProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [showNotes, setShowNotes] = useState(false);

  const totalSteps = slides.length;
  const currentSlide = slides[currentStep];

  const goNext = useCallback(() => {
    if (currentStep < totalSteps - 1) setCurrentStep((s) => s + 1);
  }, [currentStep, totalSteps]);

  const goPrev = useCallback(() => {
    if (currentStep > 0) setCurrentStep((s) => s - 1);
  }, [currentStep]);

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      switch (e.key) {
        case "ArrowRight":
        case "ArrowDown":
        case " ":
          e.preventDefault();
          goNext();
          break;
        case "ArrowLeft":
        case "ArrowUp":
          e.preventDefault();
          goPrev();
          break;
        case "Escape":
          // Will navigate back via link
          break;
        case "n":
        case "N":
          setShowNotes((v) => !v);
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goNext, goPrev]);

  if (totalSteps === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-xl mb-4 text-muted-foreground">
            Aucun slide dans cette présentation
          </p>
          <Link href={`/genspark/${presentation.id}`}>
            <Button variant="outline">Retour à l&apos;éditeur</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border/30 shrink-0">
        <h2 className="text-white/70 text-sm font-medium truncate max-w-md">
          {presentation.title}
        </h2>
        <div className="flex items-center gap-3">
          <Badge
            variant="outline"
            className="bg-muted/30 border-border/50 text-[11px] font-medium uppercase tracking-wider"
          >
            {currentStep + 1} / {totalSteps}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowNotes((v) => !v)}
            className={cn(
              "text-white/70 hover:text-white hover:bg-white/10",
              showNotes && "bg-white/10 text-white",
            )}
          >
            <StickyNote className="h-4 w-4 mr-1" />
            Notes
          </Button>
          <Link href={`/genspark/${presentation.id}`}>
            <Button
              variant="ghost"
              size="sm"
              className="text-white/70 hover:text-white hover:bg-white/10"
            >
              <X className="h-4 w-4 mr-1" />
              Quitter
            </Button>
          </Link>
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-6 shrink-0">
        <div className="h-1 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand rounded-full transition-all duration-300"
            style={{
              width: `${((currentStep + 1) / totalSteps) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex">
        <div className="flex-1 flex items-center justify-center px-8 py-6">
          <div className="w-full max-w-5xl">
            <SlideRenderer
              slide={currentSlide}
              theme={presentation.theme}
              className="shadow-2xl shadow-black/40 rounded-xl"
            />
          </div>
        </div>

        {/* Notes panel */}
        {showNotes && currentSlide?.notes && (
          <div className="w-[300px] border-l border-border/30 p-4 overflow-y-auto shrink-0">
            <h3 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-3">
              Notes du présentateur
            </h3>
            <p className="text-sm text-foreground/80 whitespace-pre-line leading-relaxed">
              {currentSlide.notes}
            </p>
          </div>
        )}
      </div>

      {/* Step indicators */}
      <div className="flex justify-center gap-1.5 pb-2 shrink-0">
        {slides.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentStep(idx)}
            className={cn(
              "h-2 rounded-full transition-all duration-300",
              idx === currentStep
                ? "w-6 bg-brand"
                : idx < currentStep
                  ? "w-2 bg-brand/60"
                  : "w-2 bg-white/20",
            )}
          />
        ))}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between px-6 py-4 shrink-0">
        <Button
          onClick={goPrev}
          disabled={currentStep === 0}
          variant="ghost"
          size="lg"
          className="text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-30"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Précédent
        </Button>

        <Button
          onClick={goNext}
          disabled={currentStep === totalSteps - 1}
          size="lg"
          className="bg-brand text-brand-dark hover:bg-brand/90 disabled:opacity-30"
        >
          Suivant
          <ArrowRight className="h-5 w-5 ml-2" />
        </Button>
      </div>
    </div>
  );
}
