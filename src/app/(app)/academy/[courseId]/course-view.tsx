"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { submitQuizAttempt } from "@/lib/actions/academy";
import type { Course, Lesson, LessonProgress, Quiz } from "@/lib/types/database";
import { cn } from "@/lib/utils";
import {
  Play,
  CheckCircle2,
  Lock,
  ArrowLeft,
  FileText,
  AlertTriangle,
  Clock,
  Trophy,
  RotateCcw,
  XCircle,
} from "lucide-react";
import Link from "next/link";

interface PrerequisiteInfo {
  courseId: string;
  title: string;
  completed: boolean;
}

interface QuizAttemptInfo {
  todayAttempts: number;
  bestScore: number;
  maxAttempts: number;
}

interface CourseViewProps {
  course: Course;
  lessons: Lesson[];
  progress: LessonProgress[];
  quizzes: Quiz[];
  userId: string;
  prerequisites?: PrerequisiteInfo[];
  allPrereqsMet?: boolean;
  quizAttempts?: Record<string, QuizAttemptInfo>;
}

export function CourseView({
  course,
  lessons,
  progress: initialProgress,
  quizzes,
  userId,
  prerequisites = [],
  allPrereqsMet = true,
  quizAttempts: initialQuizAttempts = {},
}: CourseViewProps) {
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(
    allPrereqsMet ? lessons[0] || null : null
  );
  const [progress, setProgress] = useState(initialProgress);
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState<number | null>(null);
  const [quizAttempts, setQuizAttempts] = useState(initialQuizAttempts);
  const [submitting, setSubmitting] = useState(false);

  const completedLessonIds = progress
    .filter((p) => p.completed)
    .map((p) => p.lesson_id);

  const courseProgress = lessons.length
    ? Math.round((completedLessonIds.length / lessons.length) * 100)
    : 0;

  function isLessonUnlocked(lesson: Lesson) {
    if (!allPrereqsMet) return false;
    if (lesson.position === 0) return true;
    const prevLesson = lessons.find((l) => l.position === lesson.position - 1);
    if (!prevLesson) return true;
    return completedLessonIds.includes(prevLesson.id);
  }

  function isLessonCompleted(lessonId: string) {
    return completedLessonIds.includes(lessonId);
  }

  async function markLessonComplete(lessonId: string) {
    const supabase = createClient();
    const { error } = await supabase.from("lesson_progress").upsert({
      user_id: userId,
      lesson_id: lessonId,
      completed: true,
      completed_at: new Date().toISOString(),
    });

    if (!error) {
      setProgress((prev) => [
        ...prev.filter((p) => p.lesson_id !== lessonId),
        {
          id: lessonId,
          user_id: userId,
          lesson_id: lessonId,
          completed: true,
          quiz_score: null,
          completed_at: new Date().toISOString(),
        },
      ]);
      toast.success("Lecon terminee !");
    }
  }

  function getQuizForLesson(lessonId: string) {
    return quizzes.find((q) => q.lesson_id === lessonId);
  }

  function getAttemptsForLesson(lessonId: string): QuizAttemptInfo | null {
    return quizAttempts[lessonId] || null;
  }

  function isQuizLocked(lessonId: string): boolean {
    const attempts = getAttemptsForLesson(lessonId);
    if (!attempts) return false;
    return attempts.todayAttempts >= attempts.maxAttempts;
  }

  async function handleQuizSubmit() {
    if (!activeLesson) return;
    const quiz = getQuizForLesson(activeLesson.id);
    if (!quiz) return;

    if (isQuizLocked(activeLesson.id)) {
      toast.error("Nombre maximum de tentatives atteint pour aujourd'hui");
      return;
    }

    let correct = 0;
    quiz.questions.forEach((q, i) => {
      if (quizAnswers[i] === q.correct_index) correct++;
    });

    const score = Math.round((correct / quiz.questions.length) * 100);
    const passed = score >= (quiz.passing_score || 70);

    setSubmitting(true);
    try {
      const result = await submitQuizAttempt(
        quiz.id,
        activeLesson.id,
        quizAnswers,
        score,
        passed
      );

      setQuizSubmitted(true);
      setQuizScore(score);

      // Update local attempts count
      setQuizAttempts((prev) => ({
        ...prev,
        [activeLesson.id]: {
          todayAttempts: (prev[activeLesson.id]?.todayAttempts || 0) + 1,
          bestScore: Math.max(prev[activeLesson.id]?.bestScore || 0, score),
          maxAttempts: prev[activeLesson.id]?.maxAttempts || 3,
        },
      }));

      if (passed) {
        markLessonComplete(activeLesson.id);
        toast.success(`Quiz reussi ! Score : ${score}%`);
      } else {
        toast.error(
          `Score : ${score}%. Il faut minimum ${quiz.passing_score || 70}% pour valider. ${result.attemptsLeft > 0 ? `Il vous reste ${result.attemptsLeft} tentative(s) aujourd'hui.` : "Plus de tentatives aujourd'hui."}`
        );
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erreur lors de la soumission";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  const activeQuiz = activeLesson
    ? getQuizForLesson(activeLesson.id)
    : null;

  const activeAttempts = activeLesson
    ? getAttemptsForLesson(activeLesson.id)
    : null;

  return (
    <div>
      <div className="mb-4">
        <Link
          href="/academy"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux formations
        </Link>
      </div>

      {/* Prerequisites warning banner */}
      {!allPrereqsMet && prerequisites.length > 0 && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-amber-800 dark:text-amber-200">
                Prerequis requis
              </h3>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                Vous devez terminer les cours suivants avant d&apos;acceder a
                cette formation :
              </p>
              <ul className="mt-3 space-y-2">
                {prerequisites
                  .filter((p) => !p.completed)
                  .map((prereq) => (
                    <li key={prereq.courseId} className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-amber-600" />
                      <Link
                        href={`/academy/${prereq.courseId}`}
                        className="text-sm font-medium text-amber-800 dark:text-amber-200 underline underline-offset-2 hover:text-amber-900"
                      >
                        {prereq.title}
                      </Link>
                    </li>
                  ))}
                {prerequisites
                  .filter((p) => p.completed)
                  .map((prereq) => (
                    <li
                      key={prereq.courseId}
                      className="flex items-center gap-2"
                    >
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span className="text-sm text-amber-700 dark:text-amber-300 line-through">
                        {prereq.title}
                      </span>
                    </li>
                  ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Course header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">{course.title}</h1>
        {course.description && (
          <p className="text-muted-foreground mb-4">{course.description}</p>
        )}
        <div className="flex items-center gap-2">
          <Progress value={courseProgress} className="h-2 flex-1 max-w-xs" />
          <span className="text-sm font-medium">{courseProgress}%</span>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Lesson sidebar */}
        <Card className="w-72 shrink-0 h-fit sticky top-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Lecons</CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <div className="space-y-0.5">
              {lessons.map((lesson) => {
                const unlocked = isLessonUnlocked(lesson);
                const completed = isLessonCompleted(lesson.id);

                return (
                  <button
                    key={lesson.id}
                    disabled={!unlocked}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-left transition-colors",
                      activeLesson?.id === lesson.id
                        ? "bg-brand/10 font-medium"
                        : unlocked
                        ? "hover:bg-muted"
                        : "opacity-50 cursor-not-allowed",
                      completed && "text-brand"
                    )}
                    onClick={() => {
                      if (unlocked) {
                        setActiveLesson(lesson);
                        setShowQuiz(false);
                        setQuizAnswers({});
                        setQuizSubmitted(false);
                        setQuizScore(null);
                      }
                    }}
                  >
                    {completed ? (
                      <CheckCircle2 className="h-4 w-4 text-brand shrink-0" />
                    ) : unlocked ? (
                      <Play className="h-4 w-4 shrink-0" />
                    ) : (
                      <Lock className="h-4 w-4 shrink-0" />
                    )}
                    <span className="truncate">{lesson.title}</span>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Lesson content */}
        <div className="flex-1">
          {activeLesson ? (
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-bold mb-4">{activeLesson.title}</h2>

                {!showQuiz ? (
                  <>
                    {/* Video player */}
                    {activeLesson.video_url && (
                      <div className="aspect-video bg-black rounded-lg mb-6 overflow-hidden">
                        <iframe
                          src={activeLesson.video_url}
                          className="w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    )}

                    {activeLesson.description && (
                      <p className="text-muted-foreground mb-4">
                        {activeLesson.description}
                      </p>
                    )}

                    {/* Transcript */}
                    {activeLesson.transcript && (
                      <>
                        <Separator className="my-4" />
                        <h3 className="font-semibold mb-2 flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Transcript
                        </h3>
                        <div className="prose prose-sm max-w-none text-muted-foreground">
                          {activeLesson.transcript}
                        </div>
                      </>
                    )}

                    {/* Actions */}
                    <div className="flex flex-wrap gap-3 mt-6 items-center">
                      {activeQuiz && !isLessonCompleted(activeLesson.id) && (
                        <div className="flex flex-col gap-2">
                          <Button
                            onClick={() => setShowQuiz(true)}
                            className="bg-brand text-brand-dark hover:bg-brand/90"
                            disabled={isQuizLocked(activeLesson.id)}
                          >
                            Passer le quiz
                          </Button>
                          {/* Quiz attempts info */}
                          {activeAttempts && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span>
                                Tentatives aujourd&apos;hui :{" "}
                                {activeAttempts.todayAttempts}/
                                {activeAttempts.maxAttempts}
                              </span>
                              {activeAttempts.bestScore > 0 && (
                                <>
                                  <span className="mx-1">|</span>
                                  <Trophy className="h-3 w-3" />
                                  <span>
                                    Meilleur score : {activeAttempts.bestScore}%
                                  </span>
                                </>
                              )}
                            </div>
                          )}
                          {isQuizLocked(activeLesson.id) && (
                            <p className="text-xs text-amber-600">
                              Nombre maximum de tentatives atteint pour
                              aujourd&apos;hui. Revenez demain !
                            </p>
                          )}
                        </div>
                      )}
                      {!activeQuiz && !isLessonCompleted(activeLesson.id) && (
                        <Button
                          onClick={() => markLessonComplete(activeLesson.id)}
                          className="bg-brand text-brand-dark hover:bg-brand/90"
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Marquer comme termine
                        </Button>
                      )}
                      {isLessonCompleted(activeLesson.id) && (
                        <Badge className="bg-brand/10 text-brand border-brand/20">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Lecon terminee
                        </Badge>
                      )}
                    </div>
                  </>
                ) : (
                  /* Quiz */
                  activeQuiz && (
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">Quiz</h3>
                        {activeAttempts && (
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              {activeAttempts.todayAttempts}/
                              {activeAttempts.maxAttempts} tentatives
                            </span>
                            {activeAttempts.bestScore > 0 && (
                              <span className="flex items-center gap-1">
                                <Trophy className="h-3.5 w-3.5" />
                                Meilleur : {activeAttempts.bestScore}%
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="space-y-6">
                        {activeQuiz.questions.map((q, qi) => (
                          <div key={qi}>
                            <p className="font-medium mb-3">
                              {qi + 1}. {q.question}
                            </p>
                            <div className="space-y-2">
                              {q.options.map((option, oi) => (
                                <button
                                  key={oi}
                                  disabled={quizSubmitted}
                                  className={cn(
                                    "w-full text-left p-3 rounded-lg border transition-colors text-sm",
                                    quizAnswers[qi] === oi
                                      ? "border-brand bg-brand/5"
                                      : "hover:bg-muted",
                                    quizSubmitted &&
                                      oi === q.correct_index &&
                                      "border-green-500 bg-green-50 dark:bg-green-950/20",
                                    quizSubmitted &&
                                      quizAnswers[qi] === oi &&
                                      oi !== q.correct_index &&
                                      "border-red-500 bg-red-50 dark:bg-red-950/20"
                                  )}
                                  onClick={() =>
                                    setQuizAnswers((prev) => ({
                                      ...prev,
                                      [qi]: oi,
                                    }))
                                  }
                                >
                                  <div className="flex items-center justify-between">
                                    <span>{option}</span>
                                    {quizSubmitted &&
                                      oi === q.correct_index && (
                                        <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                                      )}
                                    {quizSubmitted &&
                                      quizAnswers[qi] === oi &&
                                      oi !== q.correct_index && (
                                        <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                                      )}
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Quiz results summary */}
                      {quizSubmitted && quizScore !== null && (
                        <div className="mt-6">
                          <Separator className="mb-6" />
                          <Card
                            className={cn(
                              "border-2",
                              quizScore >= (activeQuiz.passing_score || 70)
                                ? "border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20"
                                : "border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/20"
                            )}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-center gap-4">
                                {quizScore >=
                                (activeQuiz.passing_score || 70) ? (
                                  <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-3">
                                    <Trophy className="h-6 w-6 text-green-600" />
                                  </div>
                                ) : (
                                  <div className="rounded-full bg-red-100 dark:bg-red-900/30 p-3">
                                    <XCircle className="h-6 w-6 text-red-500" />
                                  </div>
                                )}
                                <div className="flex-1">
                                  <p className="font-semibold text-lg">
                                    Score : {quizScore}%
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    {quizScore >=
                                    (activeQuiz.passing_score || 70)
                                      ? "Felicitations ! Vous avez reussi le quiz."
                                      : `Score minimum requis : ${activeQuiz.passing_score || 70}%. Revisez la lecon et reessayez.`}
                                  </p>
                                  {quizScore <
                                    (activeQuiz.passing_score || 70) &&
                                    activeAttempts && (
                                      <p className="text-xs text-muted-foreground mt-1">
                                        Tentatives restantes aujourd&apos;hui :{" "}
                                        {Math.max(
                                          0,
                                          activeAttempts.maxAttempts -
                                            activeAttempts.todayAttempts
                                        )}
                                      </p>
                                    )}
                                </div>
                              </div>

                              {/* Detailed question results */}
                              <div className="mt-4 space-y-2">
                                <p className="text-xs font-medium text-muted-foreground uppercase">
                                  Detail des reponses
                                </p>
                                {activeQuiz.questions.map((q, qi) => {
                                  const isCorrect =
                                    quizAnswers[qi] === q.correct_index;
                                  return (
                                    <div
                                      key={qi}
                                      className="flex items-center gap-2 text-sm"
                                    >
                                      {isCorrect ? (
                                        <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />
                                      ) : (
                                        <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                                      )}
                                      <span
                                        className={cn(
                                          isCorrect
                                            ? "text-green-700 dark:text-green-400"
                                            : "text-red-600 dark:text-red-400"
                                        )}
                                      >
                                        Q{qi + 1}: {q.question.slice(0, 60)}
                                        {q.question.length > 60 ? "..." : ""}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      )}

                      <div className="flex gap-3 mt-6">
                        {!quizSubmitted ? (
                          <Button
                            onClick={handleQuizSubmit}
                            className="bg-brand text-brand-dark hover:bg-brand/90"
                            disabled={
                              Object.keys(quizAnswers).length !==
                                activeQuiz.questions.length ||
                              submitting ||
                              isQuizLocked(activeLesson.id)
                            }
                          >
                            {submitting
                              ? "Envoi en cours..."
                              : "Valider le quiz"}
                          </Button>
                        ) : (
                          <div className="flex gap-3">
                            <Button
                              onClick={() => {
                                setShowQuiz(false);
                                setQuizAnswers({});
                                setQuizSubmitted(false);
                                setQuizScore(null);
                              }}
                              variant="outline"
                            >
                              Retour a la lecon
                            </Button>
                            {quizScore !== null &&
                              quizScore <
                                (activeQuiz.passing_score || 70) &&
                              !isQuizLocked(activeLesson.id) && (
                                <Button
                                  onClick={() => {
                                    setQuizAnswers({});
                                    setQuizSubmitted(false);
                                    setQuizScore(null);
                                  }}
                                  className="gap-2"
                                  variant="outline"
                                >
                                  <RotateCcw className="h-4 w-4" />
                                  Reessayer
                                </Button>
                              )}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              {allPrereqsMet
                ? "Selectionnez une lecon pour commencer"
                : "Completez les prerequis pour acceder aux lecons"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
