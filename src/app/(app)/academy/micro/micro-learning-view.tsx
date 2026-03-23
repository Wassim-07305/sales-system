"use client";

import { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/layout/page-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn, sanitizeHtml } from "@/lib/utils";
import { completeMicroLesson } from "@/lib/actions/academy";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Clock,
  GraduationCap,
  Sparkles,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MicroLesson {
  id: string;
  title: string;
  content: string | null;
  duration_minutes: number | null;
  type: string | null;
  position: number;
  course_id: string;
  course_title: string;
  module_title: string;
}

interface MicroLearningViewProps {
  microLessons: MicroLesson[];
  progressMap: Record<string, boolean>;
  dailyLesson: MicroLesson | null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MicroLearningView({
  microLessons,
  progressMap,
  dailyLesson,
}: MicroLearningViewProps) {
  const [courseFilter, setCourseFilter] = useState<string>("all");
  const [expandedLessonId, setExpandedLessonId] = useState<string | null>(null);
  const [localProgress, setLocalProgress] = useState(progressMap);
  const [isPending, startTransition] = useTransition();

  // Unique courses for filter
  const courses = useMemo(() => {
    const map = new Map<string, string>();
    for (const l of microLessons) {
      map.set(l.course_id, l.course_title);
    }
    return Array.from(map, ([id, title]) => ({ id, title }));
  }, [microLessons]);

  // Filtered lessons
  const filtered = useMemo(() => {
    if (courseFilter === "all") return microLessons;
    return microLessons.filter((l) => l.course_id === courseFilter);
  }, [microLessons, courseFilter]);

  // Group by course
  const grouped = useMemo(() => {
    const groups: Record<
      string,
      { courseTitle: string; lessons: MicroLesson[] }
    > = {};
    for (const lesson of filtered) {
      if (!groups[lesson.course_id]) {
        groups[lesson.course_id] = {
          courseTitle: lesson.course_title,
          lessons: [],
        };
      }
      groups[lesson.course_id].lessons.push(lesson);
    }
    return groups;
  }, [filtered]);

  // Progress stats
  const completedCount = microLessons.filter((l) => localProgress[l.id]).length;
  const totalCount = microLessons.length;
  const progressPercent =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  function handleComplete(lessonId: string) {
    startTransition(async () => {
      try {
        await completeMicroLesson(lessonId);
        setLocalProgress((prev) => ({ ...prev, [lessonId]: true }));
        toast.success("Micro-lecon terminee !", {
          style: { background: "#09090b", color: "#fff" },
        });
      } catch {
        toast.error("Erreur lors de la validation", {
          style: { background: "#09090b", color: "#fff" },
        });
      }
    });
  }

  // Empty state
  if (totalCount === 0) {
    return (
      <div>
        <PageHeader
          title="Micro-learning"
          description="Lecons courtes pour progresser chaque jour"
        >
          <Button asChild variant="outline" size="sm">
            <Link href="/academy">
              <ArrowLeft className="size-4" />
              Retour Academy
            </Link>
          </Button>
        </PageHeader>

        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <div className="h-16 w-16 rounded-2xl bg-muted/40 ring-1 ring-border/30 flex items-center justify-center mb-4">
            <GraduationCap className="size-8 text-muted-foreground/40" />
          </div>
          <p className="text-lg font-medium">Aucune micro-lecon disponible</p>
          <p className="mt-2 max-w-md text-center text-sm">
            Les micro-lecons sont des lecons courtes (5 min ou moins). Elles
            apparaitront ici automatiquement lorsque des lecons de ce format
            seront ajoutees a vos formations.
          </p>
          <Button asChild className="mt-6" variant="outline">
            <Link href="/academy">Voir toutes les formations</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <PageHeader
        title="Micro-learning"
        description="Lecons courtes pour progresser chaque jour"
      >
        <Button asChild variant="outline" size="sm">
          <Link href="/academy">
            <ArrowLeft className="size-4" />
            Retour Academy
          </Link>
        </Button>
      </PageHeader>

      {/* Global progress bar */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="font-medium">
              {completedCount}/{totalCount} micro-lecons completees
            </span>
            <span className="text-muted-foreground">{progressPercent}%</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </CardContent>
      </Card>

      {/* Daily lesson hero card */}
      {dailyLesson && !localProgress[dailyLesson.id] && (
        <Card className="mb-8 overflow-hidden rounded-2xl border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-transparent shadow-lg shadow-emerald-500/5">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-emerald-500 mb-3">
              <Sparkles className="size-5" />
              <span className="text-sm font-semibold uppercase tracking-wider">
                Lecon du jour
              </span>
            </div>

            <h2 className="text-xl font-bold mb-1">{dailyLesson.title}</h2>

            <div className="flex items-center gap-3 text-sm text-muted-foreground mb-3">
              <span className="flex items-center gap-1">
                <BookOpen className="size-3.5" />
                {dailyLesson.course_title}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="size-3.5" />
                {dailyLesson.duration_minutes ?? "< 5"} min
              </span>
            </div>

            {dailyLesson.content && (
              <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                {dailyLesson.content.replace(/<[^>]*>/g, "").substring(0, 200)}
                ...
              </p>
            )}

            {expandedLessonId === dailyLesson.id ? (
              <div className="space-y-4">
                {dailyLesson.content && (
                  <div
                    className="prose prose-sm prose-invert max-w-none rounded-lg bg-muted/50 p-4"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(dailyLesson.content) }}
                  />
                )}
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleComplete(dailyLesson.id)}
                    disabled={isPending}
                    className="bg-emerald-500 text-black hover:bg-emerald-400"
                  >
                    <CheckCircle2 className="size-4" />
                    Marquer comme terminee
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setExpandedLessonId(null)}
                  >
                    Reduire
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                onClick={() => setExpandedLessonId(dailyLesson.id)}
                className="bg-emerald-500 text-black hover:bg-emerald-400"
              >
                <Zap className="size-4" />
                Commencer
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Filter by course */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Toutes les micro-lecons</h3>
        <Select value={courseFilter} onValueChange={setCourseFilter}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Filtrer par cours" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les cours</SelectItem>
            {courses.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Grouped lessons grid */}
      <div className="space-y-8">
        {Object.entries(grouped).map(([courseId, group]) => (
          <div key={courseId}>
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              {group.courseTitle}
            </h4>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {group.lessons.map((lesson) => {
                const isCompleted = localProgress[lesson.id];
                const isExpanded = expandedLessonId === lesson.id;

                return (
                  <Card
                    key={lesson.id}
                    className={cn(
                      "transition-all duration-200",
                      isCompleted && "opacity-70",
                      isExpanded && "sm:col-span-2 lg:col-span-3",
                    )}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {isCompleted && (
                              <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
                            )}
                            <h5
                              className={cn(
                                "font-medium text-sm truncate",
                                isCompleted &&
                                  "line-through text-muted-foreground",
                              )}
                            >
                              {lesson.title}
                            </h5>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {lesson.module_title}
                          </p>
                        </div>
                        <Badge variant="secondary" className="shrink-0 text-xs">
                          <Clock className="size-3 mr-1" />
                          {lesson.duration_minutes ?? "< 5"} min
                        </Badge>
                      </div>

                      {isExpanded && (
                        <div className="mt-4 space-y-3">
                          {lesson.content && (
                            <div
                              className="prose prose-sm prose-invert max-w-none rounded-lg bg-muted/50 p-4"
                              dangerouslySetInnerHTML={{
                                __html: sanitizeHtml(lesson.content),
                              }}
                            />
                          )}
                          {!lesson.content && (
                            <p className="text-sm text-muted-foreground italic">
                              Aucun contenu disponible pour cette lecon.
                            </p>
                          )}
                          {!isCompleted && (
                            <Button
                              size="sm"
                              onClick={() => handleComplete(lesson.id)}
                              disabled={isPending}
                              className="bg-emerald-500 text-black hover:bg-emerald-400"
                            >
                              <CheckCircle2 className="size-4" />
                              Marquer comme terminee
                            </Button>
                          )}
                        </div>
                      )}

                      {!isExpanded && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="mt-2 w-full"
                          onClick={() => setExpandedLessonId(lesson.id)}
                        >
                          {isCompleted ? "Revoir" : "Commencer"}
                        </Button>
                      )}

                      {isExpanded && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="mt-2"
                          onClick={() => setExpandedLessonId(null)}
                        >
                          Reduire
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
