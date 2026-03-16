"use client";

import { useState, useMemo, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/layout/page-header";
import {
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Trophy,
  BookOpen,
} from "lucide-react";

interface RevisionCard {
  id: string;
  lesson_id: string;
  question: string;
  answer: string;
  category: string | null;
  created_at: string;
  lessons?: { title: string; course_id: string } | null;
}

interface RevisionViewProps {
  cards: RevisionCard[];
  courses: { id: string; title: string }[];
}

export function RevisionView({ cards, courses }: RevisionViewProps) {
  const [selectedCourse, setSelectedCourse] = useState<string>("all");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [scores, setScores] = useState({ correct: 0, incorrect: 0 });
  const [sessionFinished, setSessionFinished] = useState(false);
  const [hasScored, setHasScored] = useState(false);

  const filteredCards = useMemo(() => {
    if (selectedCourse === "all") return cards;
    return cards.filter((c) => c.lessons?.course_id === selectedCourse);
  }, [cards, selectedCourse]);

  const currentCard = filteredCards[currentIndex] || null;
  const totalCards = filteredCards.length;
  const progressPercent =
    totalCards > 0 ? Math.round(((currentIndex + 1) / totalCards) * 100) : 0;

  const handleFlip = useCallback(() => {
    setIsFlipped((prev) => !prev);
  }, []);

  const handleScore = useCallback(
    (correct: boolean) => {
      if (hasScored) return;
      setScores((prev) => ({
        correct: prev.correct + (correct ? 1 : 0),
        incorrect: prev.incorrect + (correct ? 0 : 1),
      }));
      setHasScored(true);
    },
    [hasScored],
  );

  const handleNext = useCallback(() => {
    if (currentIndex < totalCards - 1) {
      setCurrentIndex((prev) => prev + 1);
      setIsFlipped(false);
      setHasScored(false);
    } else {
      setSessionFinished(true);
    }
  }, [currentIndex, totalCards]);

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setIsFlipped(false);
      setHasScored(false);
    }
  }, [currentIndex]);

  const handleRestart = useCallback(() => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setScores({ correct: 0, incorrect: 0 });
    setSessionFinished(false);
    setHasScored(false);
  }, []);

  const handleCourseChange = useCallback((value: string) => {
    setSelectedCourse(value);
    setCurrentIndex(0);
    setIsFlipped(false);
    setScores({ correct: 0, incorrect: 0 });
    setSessionFinished(false);
    setHasScored(false);
  }, []);

  if (cards.length === 0) {
    return (
      <div>
        <PageHeader
          title="Revisions"
          description="Mode flashcards pour reviser vos cours"
        />
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <div className="h-16 w-16 rounded-2xl bg-muted/40 ring-1 ring-border/30 flex items-center justify-center mb-4">
            <BookOpen className="h-8 w-8 text-muted-foreground/40" />
          </div>
          <p className="font-medium text-sm">
            Aucune carte de revision disponible
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Complétez des leçons pour générer vos flashcards
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Revisions"
        description="Mode flashcards pour reviser vos cours"
      >
        <Select value={selectedCourse} onValueChange={handleCourseChange}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Filtrer par cours" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les cours</SelectItem>
            {courses.map((course) => (
              <SelectItem key={course.id} value={course.id}>
                {course.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </PageHeader>

      {filteredCards.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <BookOpen className="h-12 w-12 mb-4 opacity-30" />
          <p className="text-sm">Aucune carte de revision pour ce cours</p>
        </div>
      ) : sessionFinished ? (
        /* Session summary */
        <div className="max-w-lg mx-auto">
          <Card className="rounded-2xl border-border/40 shadow-lg">
            <CardContent className="p-8 text-center">
              <div className="h-20 w-20 rounded-2xl bg-brand/10 ring-1 ring-brand/20 flex items-center justify-center mx-auto mb-4">
                <Trophy className="h-10 w-10 text-brand" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Session terminee !</h2>
              <p className="text-muted-foreground mb-6">
                Vous avez revu {totalCards} cartes
              </p>

              <div className="flex items-center justify-center gap-8 mb-8">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">
                    {scores.correct}
                  </div>
                  <div className="text-sm text-muted-foreground">Correctes</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-red-500">
                    {scores.incorrect}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Incorrectes
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-brand">
                    {scores.correct + scores.incorrect > 0
                      ? Math.round(
                          (scores.correct /
                            (scores.correct + scores.incorrect)) *
                            100,
                        )
                      : 0}
                    %
                  </div>
                  <div className="text-sm text-muted-foreground">Score</div>
                </div>
              </div>

              <Button
                onClick={handleRestart}
                className="bg-brand text-brand-dark hover:bg-brand/90 gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Recommencer
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : (
        /* Flashcard view */
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Progress */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              Carte {currentIndex + 1}/{totalCards}
            </span>
            <Progress value={progressPercent} className="h-2 flex-1" />
            <div className="flex items-center gap-2 text-sm">
              <span className="text-green-600 font-medium">
                {scores.correct}
              </span>
              <span className="text-muted-foreground">/</span>
              <span className="text-red-500 font-medium">
                {scores.incorrect}
              </span>
            </div>
          </div>

          {/* Lesson context */}
          {currentCard?.lessons?.title && (
            <div className="text-center">
              <Badge variant="secondary" className="text-xs">
                {currentCard.lessons.title}
              </Badge>
            </div>
          )}

          {/* Flashcard */}
          <div
            className="perspective-1000 cursor-pointer"
            style={{ perspective: "1000px" }}
            onClick={handleFlip}
          >
            <div
              className="relative w-full transition-transform duration-600"
              style={{
                transformStyle: "preserve-3d",
                transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                transitionDuration: "0.6s",
              }}
            >
              {/* Front */}
              <Card
                className="w-full rounded-2xl border-border/40"
                style={{
                  backfaceVisibility: "hidden",
                }}
              >
                <CardContent className="p-10 min-h-[300px] flex flex-col items-center justify-center text-center">
                  <Badge variant="outline" className="mb-4 text-xs">
                    Question
                  </Badge>
                  <p className="text-lg font-medium leading-relaxed">
                    {currentCard?.question}
                  </p>
                  <p className="text-xs text-muted-foreground mt-6">
                    Cliquez pour retourner la carte
                  </p>
                </CardContent>
              </Card>

              {/* Back */}
              <Card
                className="w-full absolute top-0 left-0 rounded-2xl border-border/40"
                style={{
                  backfaceVisibility: "hidden",
                  transform: "rotateY(180deg)",
                }}
              >
                <CardContent className="p-10 min-h-[300px] flex flex-col items-center justify-center text-center">
                  <Badge className="mb-4 text-xs bg-brand/10 text-brand border-brand/20">
                    Reponse
                  </Badge>
                  <p className="text-lg leading-relaxed">
                    {currentCard?.answer}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Score buttons (visible when flipped) */}
          {isFlipped && !hasScored && (
            <div className="flex items-center justify-center gap-4">
              <Button
                variant="outline"
                size="lg"
                className="gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={() => handleScore(false)}
              >
                <X className="h-4 w-4" />
                Je ne savais pas
              </Button>
              <Button
                size="lg"
                className="gap-2 bg-green-600 text-white hover:bg-green-700"
                onClick={() => handleScore(true)}
              >
                <Check className="h-4 w-4" />
                Je savais !
              </Button>
            </div>
          )}

          {isFlipped && hasScored && (
            <div className="text-center text-sm text-muted-foreground">
              Reponse enregistree. Passez a la carte suivante.
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentIndex === 0}
              className="gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Precedente
            </Button>

            <Button variant="outline" onClick={handleFlip} className="gap-2">
              <RotateCcw className="h-4 w-4" />
              Retourner
            </Button>

            <Button
              onClick={handleNext}
              className="gap-2 bg-brand text-brand-dark hover:bg-brand/90"
            >
              {currentIndex === totalCards - 1 ? "Terminer" : "Suivante"}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
