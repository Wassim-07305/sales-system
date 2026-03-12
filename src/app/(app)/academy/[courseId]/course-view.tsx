"use client";

import { useState, useRef, useMemo, useCallback, useEffect, useTransition, startTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { markLessonComplete, submitQuizAttempt } from "@/lib/actions/academy";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import Link from "next/link";
import {
  Play,
  PlayCircle,
  CheckCircle2,
  Circle,
  Lock,
  ChevronDown,
  ChevronRight,
  FileText,
  Video,
  Headphones,
  File,
  Download,
  ArrowLeft,
  ArrowRight,
  AlertTriangle,
  XCircle,
  Clock,
  Trophy,
  RotateCcw,
  Menu,
  X,
  Loader2,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LessonData {
  id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  subtitle_url: string | null;
  duration_minutes: number | null;
  attachments: Array<{ name: string; url: string; type: string }>;
  content_html: string | null;
  position: number;
}

interface ModuleData {
  id: string;
  title: string;
  description: string | null;
  position: number;
  lessons: LessonData[];
}

interface PrerequisiteInfo {
  courseId?: string;
  prerequisite_course_id?: string;
  title?: string;
  prerequisite?: { id: string; title: string } | null;
  completed: boolean;
}

interface QuizAttemptInfo {
  todayAttempts: number;
  bestScore: number;
  maxAttempts: number;
}

interface CourseViewProps {
  course: {
    id: string;
    title: string;
    description: string | null;
    modules: ModuleData[];
  };
  progressMap: Record<string, { completed: boolean; quiz_score: number | null }>;
  quizMap: Record<string, Record<string, unknown>>;
  prerequisites: PrerequisiteInfo[];
  allPrereqsMet: boolean;
  userId: string;
  quizAttempts?: Record<string, QuizAttemptInfo>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getVideoEmbed(url: string): {
  type: "iframe" | "video" | "none";
  src: string;
} {
  if (!url) return { type: "none", src: "" };

  // YouTube
  if (url.includes("youtube.com") || url.includes("youtu.be")) {
    let id: string | null | undefined = null;
    if (url.includes("youtu.be")) {
      id = url.split("/").pop()?.split("?")[0];
    } else {
      try {
        id = new URL(url).searchParams.get("v");
      } catch {
        id = null;
      }
    }
    if (id) return { type: "iframe", src: `https://www.youtube.com/embed/${id}` };
  }

  // Vimeo
  if (url.includes("vimeo.com")) {
    const id = url.split("/").pop()?.split("?")[0];
    if (id) return { type: "iframe", src: `https://player.vimeo.com/video/${id}` };
  }

  // Loom
  if (url.includes("loom.com")) {
    const id = url.split("/").pop()?.split("?")[0];
    if (id) return { type: "iframe", src: `https://www.loom.com/embed/${id}` };
  }

  // Direct video
  return { type: "video", src: url };
}

function getAttachmentIcon(type: string) {
  if (type.includes("pdf") || type.includes("document") || type.includes("text"))
    return FileText;
  if (type.includes("video")) return Video;
  if (type.includes("audio")) return Headphones;
  return File;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CourseView({
  course,
  progressMap,
  quizMap,
  prerequisites,
  allPrereqsMet,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  userId,
  quizAttempts: initialQuizAttempts = {},
}: CourseViewProps) {
  // -- Flatten all lessons with module context for navigation
  const flatLessons = useMemo(() => {
    const list: Array<LessonData & { moduleId: string; moduleTitle: string }> = [];
    for (const mod of course.modules) {
      for (const lesson of mod.lessons) {
        list.push({ ...lesson, moduleId: mod.id, moduleTitle: mod.title });
      }
    }
    return list;
  }, [course.modules]);

  // -- Progress state (local copy for optimistic updates)
  const [localProgress, setLocalProgress] = useState(progressMap);
  const [quizAttempts, setQuizAttempts] = useState(initialQuizAttempts);

  const completedLessonIds = useMemo(
    () => new Set(Object.entries(localProgress).filter(([, v]) => v.completed).map(([k]) => k)),
    [localProgress]
  );

  const totalLessons = flatLessons.length;
  const completedCount = completedLessonIds.size;
  const progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  // -- Sequential unlock logic
  const isLessonUnlocked = useCallback(
    (lessonId: string): boolean => {
      if (!allPrereqsMet) return false;
      const idx = flatLessons.findIndex((l) => l.id === lessonId);
      if (idx <= 0) return true; // premiere lecon toujours accessible
      const prevLesson = flatLessons[idx - 1];
      return completedLessonIds.has(prevLesson.id);
    },
    [allPrereqsMet, flatLessons, completedLessonIds]
  );

  // -- Find first incomplete lesson
  const firstIncompleteLessonId = useMemo(() => {
    for (const lesson of flatLessons) {
      if (!completedLessonIds.has(lesson.id)) return lesson.id;
    }
    return flatLessons[0]?.id ?? null;
  }, [flatLessons, completedLessonIds]);

  // -- Selected lesson
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(
    allPrereqsMet ? firstIncompleteLessonId : null
  );

  const selectedLesson = useMemo(
    () => flatLessons.find((l) => l.id === selectedLessonId) ?? null,
    [flatLessons, selectedLessonId]
  );

  const selectedLessonIndex = useMemo(
    () => flatLessons.findIndex((l) => l.id === selectedLessonId),
    [flatLessons, selectedLessonId]
  );

  // -- Expanded modules
  const [expandedModules, setExpandedModules] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    // Expand modules containing incomplete lessons or completed lessons
    for (const mod of course.modules) {
      const hasIncomplete = mod.lessons.some((l) => !completedLessonIds.has(l.id));
      const hasCompleted = mod.lessons.some((l) => completedLessonIds.has(l.id));
      if (hasIncomplete || hasCompleted) initial.add(mod.id);
    }
    // If nothing expanded, expand first module
    if (initial.size === 0 && course.modules.length > 0) {
      initial.add(course.modules[0].id);
    }
    return initial;
  });

  // -- Quiz state
  const [quizOpen, setQuizOpen] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // -- Video auto-completion
  const videoRef = useRef<HTMLVideoElement>(null);
  const [autoCompleted, setAutoCompleted] = useState(false);

  // -- Transitions for async actions
  const [markingComplete, startMarkTransition] = useTransition();

  // -- Mobile sidebar
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Reset auto-completed when lesson changes
  useEffect(() => {
    setAutoCompleted(false);
  }, [selectedLessonId]);

  // -- Handlers
  function toggleModule(moduleId: string) {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) next.delete(moduleId);
      else next.add(moduleId);
      return next;
    });
  }

  function selectLesson(lessonId: string) {
    if (!isLessonUnlocked(lessonId)) return;
    setSelectedLessonId(lessonId);
    setQuizOpen(false);
    setQuizAnswers({});
    setQuizSubmitted(false);
    setQuizScore(null);
    setMobileSidebarOpen(false);
  }

  function handleMarkComplete() {
    if (!selectedLessonId) return;
    if (completedLessonIds.has(selectedLessonId)) return;

    // Optimistic update — UI reacts instantly
    const lessonId = selectedLessonId;
    setLocalProgress((prev) => ({
      ...prev,
      [lessonId]: { completed: true, quiz_score: null },
    }));

    startMarkTransition(async () => {
      try {
        await markLessonComplete(lessonId);
        toast.success("Lecon terminee !");
      } catch {
        // Rollback on error
        setLocalProgress((prev) => {
          const next = { ...prev };
          delete next[lessonId];
          return next;
        });
        toast.error("Erreur lors de la mise a jour");
      }
    });
  }

  function handleTimeUpdate() {
    const video = videoRef.current;
    if (!video || autoCompleted) return;
    if (!video.duration) return;
    const percent = (video.currentTime / video.duration) * 100;
    if (percent >= 80) {
      setAutoCompleted(true);
      handleMarkComplete();
    }
  }

  function getQuizForLesson(lessonId: string) {
    return quizMap[lessonId] as
      | {
          id: string;
          questions: Array<{
            question: string;
            options: string[];
            correct_index: number;
          }>;
          passing_score: number;
          max_attempts_per_day: number;
        }
      | undefined;
  }

  function isQuizLocked(lessonId: string): boolean {
    const attempts = quizAttempts[lessonId];
    if (!attempts) return false;
    return attempts.todayAttempts >= attempts.maxAttempts;
  }

  async function handleQuizSubmit() {
    if (!selectedLessonId) return;
    const quiz = getQuizForLesson(selectedLessonId);
    if (!quiz) return;

    if (isQuizLocked(selectedLessonId)) {
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
        selectedLessonId,
        quizAnswers,
        score,
        passed
      );

      setQuizSubmitted(true);
      setQuizScore(score);

      setQuizAttempts((prev) => ({
        ...prev,
        [selectedLessonId]: {
          todayAttempts: (prev[selectedLessonId]?.todayAttempts || 0) + 1,
          bestScore: Math.max(prev[selectedLessonId]?.bestScore || 0, score),
          maxAttempts: prev[selectedLessonId]?.maxAttempts || 3,
        },
      }));

      if (passed) {
        await markLessonComplete(selectedLessonId);
        setLocalProgress((prev) => ({
          ...prev,
          [selectedLessonId]: { completed: true, quiz_score: score },
        }));
        toast.success(`Quiz reussi ! Score : ${score}%`);
      } else {
        toast.error(
          `Score : ${score}%. Il faut minimum ${quiz.passing_score || 70}% pour valider. ${
            result.attemptsLeft > 0
              ? `Il vous reste ${result.attemptsLeft} tentative(s) aujourd'hui.`
              : "Plus de tentatives aujourd'hui."
          }`
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

  function navigateLesson(direction: "prev" | "next") {
    const newIndex =
      direction === "prev" ? selectedLessonIndex - 1 : selectedLessonIndex + 1;
    if (newIndex < 0 || newIndex >= flatLessons.length) return;
    const target = flatLessons[newIndex];
    if (!isLessonUnlocked(target.id)) return;
    selectLesson(target.id);
  }

  // Current lesson's quiz data
  const activeQuiz = selectedLessonId
    ? getQuizForLesson(selectedLessonId)
    : undefined;
  const activeAttempts = selectedLessonId
    ? quizAttempts[selectedLessonId]
    : undefined;

  // ---------------------------------------------------------------------------
  // Sidebar content (shared between desktop and mobile)
  // ---------------------------------------------------------------------------
  function renderSidebar() {
    return (
      <>
        {/* Course title + back link */}
        <div className="px-5 py-4 border-b border-border">
          <Link
            href="/academy"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-3 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Retour aux formations
          </Link>
          <h2 className="text-lg font-bold leading-snug">{course.title}</h2>
        </div>

        {/* Progress section */}
        <div className="px-5 py-4 border-b border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-foreground">
              {progressPercent}%
            </span>
            <span className="text-xs text-muted-foreground">
              {completedCount}/{totalLessons} lecons terminees
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-brand transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Module sections */}
        <ScrollArea className="flex-1">
          <div className="py-2">
            {course.modules.map((mod) => {
              const isExpanded = expandedModules.has(mod.id);
              const moduleLessonCount = mod.lessons.length;
              const moduleCompletedCount = mod.lessons.filter((l) =>
                completedLessonIds.has(l.id)
              ).length;

              return (
                <div key={mod.id}>
                  {/* Module header */}
                  <button
                    onClick={() => toggleModule(mod.id)}
                    className="w-full flex items-center justify-between px-5 py-3 hover:bg-muted/50 transition-colors group"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                      <span className="text-xs font-semibold tracking-wider uppercase text-muted-foreground group-hover:text-foreground truncate transition-colors">
                        {mod.title}
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                      {moduleCompletedCount}/{moduleLessonCount}
                    </span>
                  </button>

                  {/* Lesson items */}
                  {isExpanded && (
                    <div className="pb-1">
                      {mod.lessons.map((lesson) => {
                        const completed = completedLessonIds.has(lesson.id);
                        const isActive = selectedLessonId === lesson.id;
                        const unlocked = isLessonUnlocked(lesson.id);

                        return (
                          <button
                            key={lesson.id}
                            disabled={!unlocked}
                            onClick={() => selectLesson(lesson.id)}
                            className={cn(
                              "w-full flex items-center gap-3 pl-7 pr-4 py-2.5 text-left transition-colors relative",
                              isActive &&
                                "bg-brand/10 border-l-2 border-brand",
                              !isActive && unlocked && "hover:bg-muted/50",
                              !unlocked && "opacity-40 cursor-not-allowed"
                            )}
                          >
                            {/* Status icon */}
                            <span className="shrink-0">
                              {completed ? (
                                <CheckCircle2 className="h-4 w-4 text-brand fill-brand/20" />
                              ) : isActive ? (
                                <Play className="h-4 w-4 text-brand" />
                              ) : unlocked ? (
                                <Circle className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <Lock className="h-4 w-4 text-muted-foreground" />
                              )}
                            </span>

                            {/* Title + duration */}
                            <div className="min-w-0 flex-1">
                              <p
                                className={cn(
                                  "text-sm truncate",
                                  isActive && "font-medium text-foreground",
                                  completed &&
                                    !isActive &&
                                    "text-muted-foreground",
                                  !completed &&
                                    !isActive &&
                                    unlocked &&
                                    "text-foreground"
                                )}
                              >
                                {lesson.title}
                              </p>
                              {lesson.duration_minutes && (
                                <span className="text-[11px] text-muted-foreground">
                                  {lesson.duration_minutes} min
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </>
    );
  }

  // ---------------------------------------------------------------------------
  // Main render
  // ---------------------------------------------------------------------------
  return (
    <div className="flex h-[calc(100vh-4rem)] -m-5 md:-m-8">
      {/* ---- Mobile sidebar toggle ---- */}
      <div className="md:hidden fixed top-[4.5rem] left-4 z-40">
        <Button
          variant="outline"
          size="sm"
          className="gap-2 shadow-md"
          onClick={() => setMobileSidebarOpen((v) => !v)}
        >
          <Menu className="h-4 w-4" />
          Menu du cours
        </Button>
      </div>

      {/* ---- Mobile sidebar overlay ---- */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileSidebarOpen(false)}
          />
          {/* Slide-over panel */}
          <div className="absolute inset-y-0 left-0 w-[300px] bg-card border-r border-border shadow-xl flex flex-col animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-end p-3 border-b border-border">
              <button
                onClick={() => setMobileSidebarOpen(false)}
                className="p-1 rounded-md hover:bg-muted transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {renderSidebar()}
          </div>
        </div>
      )}

      {/* ---- Desktop sidebar ---- */}
      <aside className="hidden md:flex w-[300px] shrink-0 border-r border-border bg-card flex-col overflow-hidden">
        {renderSidebar()}
      </aside>

      {/* ---- Content area ---- */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 md:p-8 pt-16 md:pt-8 max-w-4xl mx-auto">
          {/* Prerequisites banner */}
          {!allPrereqsMet && prerequisites.length > 0 ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30 p-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-amber-800 dark:text-amber-200 text-lg">
                    Prerequis non remplis
                  </h3>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                    Vous devez terminer les cours suivants avant d&apos;acceder a
                    cette formation :
                  </p>
                  <ul className="mt-4 space-y-2">
                    {prerequisites
                      .filter((p) => !p.completed)
                      .map((prereq) => {
                        const prereqId =
                          prereq.courseId ||
                          prereq.prerequisite_course_id ||
                          (prereq.prerequisite as { id: string } | null)?.id ||
                          "";
                        const prereqTitle =
                          prereq.title ||
                          (prereq.prerequisite as { title: string } | null)
                            ?.title ||
                          "Cours requis";
                        return (
                          <li
                            key={prereqId}
                            className="flex items-center gap-2"
                          >
                            <XCircle className="h-4 w-4 text-amber-600" />
                            <Link
                              href={`/academy/${prereqId}`}
                              className="text-sm font-medium text-amber-800 dark:text-amber-200 underline underline-offset-2 hover:text-amber-900"
                            >
                              {prereqTitle}
                            </Link>
                          </li>
                        );
                      })}
                    {prerequisites
                      .filter((p) => p.completed)
                      .map((prereq) => {
                        const prereqId =
                          prereq.courseId ||
                          prereq.prerequisite_course_id ||
                          (prereq.prerequisite as { id: string } | null)?.id ||
                          "";
                        const prereqTitle =
                          prereq.title ||
                          (prereq.prerequisite as { title: string } | null)
                            ?.title ||
                          "Cours requis";
                        return (
                          <li
                            key={prereqId}
                            className="flex items-center gap-2"
                          >
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                            <span className="text-sm text-amber-700 dark:text-amber-300 line-through">
                              {prereqTitle}
                            </span>
                          </li>
                        );
                      })}
                  </ul>
                </div>
              </div>
            </div>
          ) : selectedLesson ? (
            <>
              {/* ---- Video section ---- */}
              <VideoPlayer
                lesson={selectedLesson}
                videoRef={videoRef}
                onTimeUpdate={handleTimeUpdate}
              />

              {/* ---- Lesson title + description ---- */}
              <h1 className="text-2xl font-bold mt-6">{selectedLesson.title}</h1>

              {selectedLesson.description && (
                <p className="text-muted-foreground mt-2 leading-relaxed">
                  {selectedLesson.description}
                </p>
              )}

              {/* ---- HTML content (admin-authored, sanitized on server) ---- */}
              {selectedLesson.content_html && (
                <div
                  className="prose prose-sm dark:prose-invert max-w-none mt-6"
                  dangerouslySetInnerHTML={{
                    __html: selectedLesson.content_html,
                  }}
                />
              )}

              {/* ---- Attachments ---- */}
              {selectedLesson.attachments &&
                selectedLesson.attachments.length > 0 && (
                  <div className="mt-8">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                      Ressources
                    </h3>
                    <div className="space-y-2">
                      {selectedLesson.attachments.map((att, idx) => {
                        const Icon = getAttachmentIcon(att.type);
                        return (
                          <a
                            key={idx}
                            href={att.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 hover:bg-muted/50 transition-colors group"
                          >
                            <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
                            <span className="flex-1 text-sm font-medium truncate">
                              {att.name}
                            </span>
                            <span className="text-xs text-brand font-medium group-hover:underline flex items-center gap-1">
                              <Download className="h-3.5 w-3.5" />
                              Ouvrir
                            </span>
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}

              {/* ---- Action buttons ---- */}
              {!quizOpen && (
                <div className="mt-8 flex flex-wrap items-center gap-3">
                  {/* Mark complete or completed badge */}
                  {completedLessonIds.has(selectedLesson.id) ? (
                    <Badge className="bg-brand/10 text-brand border-brand/20 gap-1.5 py-1.5 px-3">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Termine
                    </Badge>
                  ) : (
                    !activeQuiz && (
                      <Button
                        onClick={handleMarkComplete}
                        disabled={markingComplete}
                        className="bg-brand text-brand-dark hover:bg-brand/90 gap-2"
                      >
                        {markingComplete ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4" />
                        )}
                        {markingComplete ? "Enregistrement..." : "Marquer comme termine"}
                      </Button>
                    )
                  )}

                  {/* Quiz button */}
                  {activeQuiz && !completedLessonIds.has(selectedLesson.id) && (
                    <div className="flex flex-col gap-1.5">
                      <Button
                        variant="outline"
                        className="gap-2"
                        onClick={() => setQuizOpen(true)}
                        disabled={isQuizLocked(selectedLesson.id)}
                      >
                        <Trophy className="h-4 w-4" />
                        Passer le quiz
                      </Button>
                      {activeAttempts && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>
                            {activeAttempts.todayAttempts}/{activeAttempts.maxAttempts}{" "}
                            tentatives aujourd&apos;hui
                          </span>
                          {activeAttempts.bestScore > 0 && (
                            <>
                              <span className="mx-0.5">|</span>
                              <Trophy className="h-3 w-3" />
                              <span>Meilleur : {activeAttempts.bestScore}%</span>
                            </>
                          )}
                        </div>
                      )}
                      {isQuizLocked(selectedLesson.id) && (
                        <p className="text-xs text-amber-600">
                          Plus de tentatives aujourd&apos;hui. Revenez demain !
                        </p>
                      )}
                    </div>
                  )}

                  {/* Spacer */}
                  <div className="flex-1" />

                  {/* Navigation */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1.5"
                      disabled={selectedLessonIndex <= 0}
                      onClick={() => navigateLesson("prev")}
                    >
                      <ArrowLeft className="h-4 w-4" />
                      <span className="hidden sm:inline">Precedente</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1.5"
                      disabled={
                        selectedLessonIndex >= flatLessons.length - 1 ||
                        !isLessonUnlocked(
                          flatLessons[selectedLessonIndex + 1]?.id ?? ""
                        )
                      }
                      onClick={() => navigateLesson("next")}
                    >
                      <span className="hidden sm:inline">Suivante</span>
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* ---- Quiz section ---- */}
              {quizOpen && activeQuiz && (
                <div className="mt-8 rounded-xl border border-border bg-card p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold">Quiz</h3>
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

                  {/* Questions */}
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
                                  : "border-border hover:bg-muted/50",
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
                                {quizSubmitted && oi === q.correct_index && (
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

                  {/* Quiz results */}
                  {quizSubmitted && quizScore !== null && (
                    <div
                      className={cn(
                        "mt-6 rounded-lg border-2 p-4",
                        quizScore >= (activeQuiz.passing_score || 70)
                          ? "border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20"
                          : "border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/20"
                      )}
                    >
                      <div className="flex items-center gap-4">
                        {quizScore >= (activeQuiz.passing_score || 70) ? (
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
                            {quizScore >= (activeQuiz.passing_score || 70)
                              ? "Felicitations ! Vous avez reussi le quiz."
                              : `Score minimum requis : ${activeQuiz.passing_score || 70}%. Revisez la lecon et reessayez.`}
                          </p>
                        </div>
                      </div>

                      {/* Question results detail */}
                      <div className="mt-4 space-y-1.5">
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
                                Q{qi + 1}:{" "}
                                {q.question.slice(0, 60)}
                                {q.question.length > 60 ? "..." : ""}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Quiz actions */}
                  <div className="flex gap-3 mt-6">
                    {!quizSubmitted ? (
                      <>
                        <Button
                          onClick={handleQuizSubmit}
                          className="bg-brand text-brand-dark hover:bg-brand/90"
                          disabled={
                            Object.keys(quizAnswers).length !==
                              activeQuiz.questions.length ||
                            submitting ||
                            isQuizLocked(selectedLesson.id)
                          }
                        >
                          {submitting
                            ? "Envoi en cours..."
                            : "Valider le quiz"}
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setQuizOpen(false);
                            setQuizAnswers({});
                            setQuizSubmitted(false);
                            setQuizScore(null);
                          }}
                        >
                          Annuler
                        </Button>
                      </>
                    ) : (
                      <div className="flex gap-3">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setQuizOpen(false);
                            setQuizAnswers({});
                            setQuizSubmitted(false);
                            setQuizScore(null);
                          }}
                        >
                          Retour a la lecon
                        </Button>
                        {quizScore !== null &&
                          quizScore <
                            (activeQuiz.passing_score || 70) &&
                          !isQuizLocked(selectedLesson.id) && (
                            <Button
                              variant="outline"
                              className="gap-2"
                              onClick={() => {
                                setQuizAnswers({});
                                setQuizSubmitted(false);
                                setQuizScore(null);
                              }}
                            >
                              <RotateCcw className="h-4 w-4" />
                              Reessayer
                            </Button>
                          )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-80 text-muted-foreground gap-3">
              <PlayCircle className="h-12 w-12 text-muted-foreground/50" />
              <p className="text-sm">
                {allPrereqsMet
                  ? "Selectionnez une lecon pour commencer"
                  : "Completez les prerequis pour acceder aux lecons"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Video position persistence (localStorage)
// ---------------------------------------------------------------------------

function getStoredPosition(lessonId: string): number {
  try {
    return parseFloat(localStorage.getItem(`video-pos:${lessonId}`) || "0") || 0;
  } catch {
    return 0;
  }
}

function storePosition(lessonId: string, time: number) {
  try {
    localStorage.setItem(`video-pos:${lessonId}`, String(Math.floor(time)));
  } catch {
    // quota exceeded
  }
}

function clearStoredPosition(lessonId: string) {
  try {
    localStorage.removeItem(`video-pos:${lessonId}`);
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// Playback speed options
// ---------------------------------------------------------------------------

const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

// ---------------------------------------------------------------------------
// Video player sub-component
// ---------------------------------------------------------------------------

function VideoPlayer({
  lesson,
  videoRef,
  onTimeUpdate,
}: {
  lesson: LessonData;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onTimeUpdate: () => void;
}) {
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [resumeTime, setResumeTime] = useState<number | null>(null);
  const [showResumeBar, setShowResumeBar] = useState(false);
  const hasRestoredRef = useRef(false);
  const saveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Check for stored position on mount / lesson change
  useEffect(() => {
    hasRestoredRef.current = false;
    const stored = getStoredPosition(lesson.id);
    if (stored > 5) {
      startTransition(() => {
        setResumeTime(stored);
        setShowResumeBar(true);
      });
    } else {
      startTransition(() => {
        setResumeTime(null);
        setShowResumeBar(false);
      });
    }
  }, [lesson.id]);

  // Periodic save of current position
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !lesson.video_url) return;

    saveIntervalRef.current = setInterval(() => {
      if (video.currentTime > 5 && !video.ended) {
        storePosition(lesson.id, video.currentTime);
      }
    }, 5000);

    return () => {
      if (saveIntervalRef.current) clearInterval(saveIntervalRef.current);
    };
  }, [lesson.id, lesson.video_url, videoRef]);

  // Clear stored position when video ends
  const handleEnded = useCallback(() => {
    clearStoredPosition(lesson.id);
  }, [lesson.id]);

  // Resume playback from stored position
  const handleResume = useCallback(() => {
    const video = videoRef.current;
    if (video && resumeTime) {
      video.currentTime = resumeTime;
      video.play();
    }
    setShowResumeBar(false);
  }, [videoRef, resumeTime]);

  // Apply playback speed when video loads or speed changes
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed, videoRef, lesson.id]);

  // Keyboard shortcuts
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if ((e.target as HTMLElement).tagName === "INPUT" || (e.target as HTMLElement).tagName === "TEXTAREA") return;

      switch (e.key) {
        case " ":
        case "k":
          e.preventDefault();
          if (video.paused) { video.play(); } else { video.pause(); }
          break;
        case "ArrowLeft":
          e.preventDefault();
          video.currentTime = Math.max(0, video.currentTime - 10);
          break;
        case "ArrowRight":
          e.preventDefault();
          video.currentTime = Math.min(video.duration, video.currentTime + 10);
          break;
        case "ArrowUp":
          e.preventDefault();
          video.volume = Math.min(1, video.volume + 0.1);
          break;
        case "ArrowDown":
          e.preventDefault();
          video.volume = Math.max(0, video.volume - 0.1);
          break;
        case "f":
          e.preventDefault();
          if (document.fullscreenElement) {
            document.exitFullscreen();
          } else {
            video.requestFullscreen();
          }
          break;
        case "m":
          e.preventDefault();
          video.muted = !video.muted;
          break;
        case ">":
          e.preventDefault();
          {
            const idx = PLAYBACK_SPEEDS.indexOf(playbackSpeed);
            if (idx < PLAYBACK_SPEEDS.length - 1) {
              setPlaybackSpeed(PLAYBACK_SPEEDS[idx + 1]);
            }
          }
          break;
        case "<":
          e.preventDefault();
          {
            const idx = PLAYBACK_SPEEDS.indexOf(playbackSpeed);
            if (idx > 0) {
              setPlaybackSpeed(PLAYBACK_SPEEDS[idx - 1]);
            }
          }
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [videoRef, playbackSpeed, lesson.id]);

  // Pas de vidéo → rien du tout
  if (!lesson.video_url) {
    return null;
  }

  const embed = getVideoEmbed(lesson.video_url);

  if (embed.type === "iframe") {
    return (
      <div className="aspect-video rounded-xl overflow-hidden bg-black">
        <iframe
          src={embed.src}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Resume bar */}
      {showResumeBar && resumeTime && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 bg-black/80 text-white rounded-lg px-4 py-2 flex items-center gap-3 text-sm backdrop-blur-sm">
          <Clock className="h-4 w-4 text-brand" />
          <span>
            Reprendre à {Math.floor(resumeTime / 60)}:{String(Math.floor(resumeTime % 60)).padStart(2, "0")}
          </span>
          <button
            onClick={handleResume}
            className="px-3 py-1 bg-brand text-brand-dark rounded-md text-xs font-medium hover:bg-brand/90"
          >
            Reprendre
          </button>
          <button
            onClick={() => setShowResumeBar(false)}
            className="p-1 hover:bg-white/10 rounded"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div className="aspect-video rounded-xl overflow-hidden bg-black">
        <video
          ref={videoRef}
          src={embed.src}
          className="w-full h-full"
          controls
          onTimeUpdate={onTimeUpdate}
          onEnded={handleEnded}
          crossOrigin="anonymous"
        >
          {lesson.subtitle_url && (
            <track
              kind="subtitles"
              src={lesson.subtitle_url}
              srcLang="fr"
              label="Français"
              default
            />
          )}
        </video>
      </div>

      {/* Playback speed control */}
      <div className="flex items-center justify-between mt-2">
        <div className="relative">
          <button
            onClick={() => setShowSpeedMenu(!showSpeedMenu)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
          >
            <Play className="h-3 w-3" />
            Vitesse : {playbackSpeed}x
          </button>
          {showSpeedMenu && (
            <div className="absolute bottom-full left-0 mb-1 bg-popover border rounded-lg shadow-lg p-1 z-20">
              {PLAYBACK_SPEEDS.map((speed) => (
                <button
                  key={speed}
                  onClick={() => {
                    setPlaybackSpeed(speed);
                    setShowSpeedMenu(false);
                  }}
                  className={cn(
                    "block w-full text-left px-3 py-1.5 rounded text-xs transition-colors",
                    speed === playbackSpeed
                      ? "bg-brand/10 text-brand font-medium"
                      : "hover:bg-muted text-foreground"
                  )}
                >
                  {speed}x
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span>Espace : lecture/pause</span>
          <span>← → : ±10s</span>
          <span>&lt; &gt; : vitesse</span>
          <span>F : plein écran</span>
        </div>
      </div>
    </div>
  );
}
