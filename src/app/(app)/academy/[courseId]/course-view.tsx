"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { Course, Lesson, LessonProgress, Quiz } from "@/lib/types/database";
import { cn } from "@/lib/utils";
import {
  Play,
  CheckCircle2,
  Lock,
  ArrowLeft,
  FileText,
  Clock,
} from "lucide-react";
import Link from "next/link";

interface CourseViewProps {
  course: Course;
  lessons: Lesson[];
  progress: LessonProgress[];
  quizzes: Quiz[];
  userId: string;
}

export function CourseView({
  course,
  lessons,
  progress: initialProgress,
  quizzes,
  userId,
}: CourseViewProps) {
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(
    lessons[0] || null
  );
  const [progress, setProgress] = useState(initialProgress);
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  const completedLessonIds = progress
    .filter((p) => p.completed)
    .map((p) => p.lesson_id);

  const courseProgress = lessons.length
    ? Math.round((completedLessonIds.length / lessons.length) * 100)
    : 0;

  function isLessonUnlocked(lesson: Lesson) {
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
      toast.success("Leçon terminée !");
    }
  }

  function getQuizForLesson(lessonId: string) {
    return quizzes.find((q) => q.lesson_id === lessonId);
  }

  function handleQuizSubmit() {
    if (!activeLesson) return;
    const quiz = getQuizForLesson(activeLesson.id);
    if (!quiz) return;

    let correct = 0;
    quiz.questions.forEach((q, i) => {
      if (quizAnswers[i] === q.correct_index) correct++;
    });

    const score = Math.round((correct / quiz.questions.length) * 100);
    setQuizSubmitted(true);

    if (score >= 70) {
      markLessonComplete(activeLesson.id);
      toast.success(`Quiz réussi ! Score : ${score}%`);
    } else {
      toast.error(`Score : ${score}%. Il faut minimum 70% pour valider.`);
    }
  }

  const activeQuiz = activeLesson
    ? getQuizForLesson(activeLesson.id)
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
            <CardTitle className="text-sm">Leçons</CardTitle>
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
                    <div className="flex gap-3 mt-6">
                      {activeQuiz && !isLessonCompleted(activeLesson.id) && (
                        <Button
                          onClick={() => setShowQuiz(true)}
                          className="bg-brand text-brand-dark hover:bg-brand/90"
                        >
                          Passer le quiz
                        </Button>
                      )}
                      {!activeQuiz && !isLessonCompleted(activeLesson.id) && (
                        <Button
                          onClick={() => markLessonComplete(activeLesson.id)}
                          className="bg-brand text-brand-dark hover:bg-brand/90"
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Marquer comme terminé
                        </Button>
                      )}
                      {isLessonCompleted(activeLesson.id) && (
                        <Badge className="bg-brand/10 text-brand border-brand/20">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Leçon terminée
                        </Badge>
                      )}
                    </div>
                  </>
                ) : (
                  /* Quiz */
                  activeQuiz && (
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Quiz</h3>
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
                                      "border-green-500 bg-green-50",
                                    quizSubmitted &&
                                      quizAnswers[qi] === oi &&
                                      oi !== q.correct_index &&
                                      "border-red-500 bg-red-50"
                                  )}
                                  onClick={() =>
                                    setQuizAnswers((prev) => ({
                                      ...prev,
                                      [qi]: oi,
                                    }))
                                  }
                                >
                                  {option}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-3 mt-6">
                        {!quizSubmitted ? (
                          <Button
                            onClick={handleQuizSubmit}
                            className="bg-brand text-brand-dark hover:bg-brand/90"
                            disabled={
                              Object.keys(quizAnswers).length !==
                              activeQuiz.questions.length
                            }
                          >
                            Valider le quiz
                          </Button>
                        ) : (
                          <Button
                            onClick={() => {
                              setShowQuiz(false);
                              setQuizAnswers({});
                              setQuizSubmitted(false);
                            }}
                            variant="outline"
                          >
                            Retour à la leçon
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              Sélectionnez une leçon pour commencer
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
