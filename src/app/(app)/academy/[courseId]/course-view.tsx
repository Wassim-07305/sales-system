"use client";

import {
  useState,
  useRef,
  useMemo,
  useCallback,
  useEffect,
  useTransition,
  startTransition,
} from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  markLessonComplete,
  submitQuizAttempt,
  notifyCourseCompletion,
} from "@/lib/actions/academy";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import Link from "next/link";
import {
  Play,
  PlayCircle,
  CheckCircle2,
  Circle,
  Lock,
  ShieldCheck,
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
  Sparkles,
  Star,
  Award,
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

interface ModuleUnlockInfo {
  unlocked: boolean;
  previousModuleQuizPassed: boolean;
  previousModuleQuizBestScore: number | null;
  previousModuleQuizTodayAttempts: number;
  previousModuleQuizMaxAttempts: number;
  previousModuleTitle: string | null;
}

interface CourseViewProps {
  course: {
    id: string;
    title: string;
    description: string | null;
    modules: ModuleData[];
  };
  progressMap: Record<
    string,
    { completed: boolean; quiz_score: number | null }
  >;
  quizMap: Record<string, Record<string, unknown>>;
  prerequisites: PrerequisiteInfo[];
  allPrereqsMet: boolean;
  userId: string;
  quizAttempts?: Record<string, QuizAttemptInfo>;
  moduleUnlockStatus?: Record<string, ModuleUnlockInfo>;
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
    if (id)
      return { type: "iframe", src: `https://www.youtube.com/embed/${id}` };
  }

  // Vimeo
  if (url.includes("vimeo.com")) {
    const id = url.split("/").pop()?.split("?")[0];
    if (id)
      return { type: "iframe", src: `https://player.vimeo.com/video/${id}` };
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
  if (
    type.includes("pdf") ||
    type.includes("document") ||
    type.includes("text")
  )
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
  moduleUnlockStatus = {},
}: CourseViewProps) {
  // -- Flatten all lessons with module context for navigation
  const flatLessons = useMemo(() => {
    const list: Array<LessonData & { moduleId: string; moduleTitle: string }> =
      [];
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
    () =>
      new Set(
        Object.entries(localProgress)
          .filter(([, v]) => v.completed)
          .map(([k]) => k),
      ),
    [localProgress],
  );

  const totalLessons = flatLessons.length;
  const completedCount = completedLessonIds.size;
  const progressPercent =
    totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  // -- Module unlock status (driven by server-side quiz score checks)
  const [localModuleUnlock, setLocalModuleUnlock] =
    useState(moduleUnlockStatus);

  // -- Track which modules just got unlocked for celebration animation
  const [justUnlockedModules, setJustUnlockedModules] = useState<Set<string>>(
    new Set(),
  );

  const isModuleUnlocked = useCallback(
    (moduleId: string, moduleIndex?: number): boolean => {
      if (!allPrereqsMet) return false;
      const status = localModuleUnlock[moduleId];
      // First module is always unlocked; others require status
      if (!status) return moduleIndex === 0 || moduleIndex === undefined;
      return status.unlocked;
    },
    [allPrereqsMet, localModuleUnlock],
  );

  const getModuleUnlockInfo = useCallback(
    (moduleId: string): ModuleUnlockInfo | null => {
      return localModuleUnlock[moduleId] || null;
    },
    [localModuleUnlock],
  );

  // -- Sequential unlock logic (now also checks module lock)
  const isLessonUnlocked = useCallback(
    (lessonId: string): boolean => {
      if (!allPrereqsMet) return false;
      const idx = flatLessons.findIndex((l) => l.id === lessonId);
      if (idx < 0) return false;

      // Check if the lesson's module is unlocked
      const lessonEntry = flatLessons[idx];
      if (!isModuleUnlocked(lessonEntry.moduleId)) return false;

      if (idx <= 0) return true; // premiere lecon toujours accessible
      const prevLesson = flatLessons[idx - 1];
      return completedLessonIds.has(prevLesson.id);
    },
    [allPrereqsMet, flatLessons, completedLessonIds, isModuleUnlocked],
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
    allPrereqsMet ? firstIncompleteLessonId : null,
  );

  const selectedLesson = useMemo(
    () => flatLessons.find((l) => l.id === selectedLessonId) ?? null,
    [flatLessons, selectedLessonId],
  );

  const selectedLessonIndex = useMemo(
    () => flatLessons.findIndex((l) => l.id === selectedLessonId),
    [flatLessons, selectedLessonId],
  );

  // -- Expanded modules
  const [expandedModules, setExpandedModules] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    // Expand modules containing incomplete lessons or completed lessons
    for (const mod of course.modules) {
      const hasIncomplete = mod.lessons.some(
        (l) => !completedLessonIds.has(l.id),
      );
      const hasCompleted = mod.lessons.some((l) =>
        completedLessonIds.has(l.id),
      );
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
  const [courseCompleted, setCourseCompleted] = useState(false);

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
    const passed = score >= (quiz.passing_score || 90);

    setSubmitting(true);
    try {
      const result = await submitQuizAttempt(
        quiz.id,
        selectedLessonId,
        quizAnswers,
        score,
        passed,
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

        // Optimistically unlock the next module if this quiz gates it
        if (score >= 90) {
          const unlockedIds: string[] = [];
          setLocalModuleUnlock((prev) => {
            const next = { ...prev };
            for (const [modId, info] of Object.entries(next)) {
              if (!info.unlocked && !info.previousModuleQuizPassed) {
                // Check if the current lesson belongs to the previous module
                const currentLessonEntry = flatLessons.find(
                  (l) => l.id === selectedLessonId,
                );
                if (currentLessonEntry) {
                  const prevModuleIdx = course.modules.findIndex(
                    (m) => m.id === currentLessonEntry.moduleId,
                  );
                  const thisModuleIdx = course.modules.findIndex(
                    (m) => m.id === modId,
                  );
                  if (thisModuleIdx === prevModuleIdx + 1) {
                    next[modId] = {
                      ...info,
                      unlocked: true,
                      previousModuleQuizPassed: true,
                      previousModuleQuizBestScore: score,
                    };
                    unlockedIds.push(modId);
                  }
                }
              }
            }
            return next;
          });

          // Trigger unlock celebration animation
          if (unlockedIds.length > 0) {
            setJustUnlockedModules(new Set(unlockedIds));
            // Auto-expand newly unlocked modules
            setExpandedModules((prev) => {
              const next = new Set(prev);
              unlockedIds.forEach((id) => next.add(id));
              return next;
            });
            // Clear celebration after animation completes
            setTimeout(() => setJustUnlockedModules(new Set()), 3000);
          }
        }

        toast.success(`Quiz reussi ! Score : ${score}%`);

        // Check if this was the last lesson — course completed
        const updatedCompleted = new Set(completedLessonIds);
        updatedCompleted.add(selectedLessonId);
        if (updatedCompleted.size >= totalLessons) {
          setCourseCompleted(true);
          // Notify admins (fire-and-forget)
          notifyCourseCompletion(course.id).catch(() => {});
        }
      } else {
        toast.error(
          `Score : ${score}%. Il faut minimum ${quiz.passing_score || 90}% pour valider. ${
            result.attemptsLeft > 0
              ? `Il vous reste ${result.attemptsLeft} tentative(s) aujourd'hui.`
              : "Plus de tentatives aujourd'hui."
          }`,
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

        {/* Certificate button — shown when all lessons completed */}
        {progressPercent === 100 && (
          <div className="px-5 py-3 border-b border-border">
            <Link href={`/academy/certificates`}>
              <Button
                variant="outline"
                className="w-full bg-[#7af17a]/10 text-[#7af17a] hover:bg-[#7af17a]/20 border-[#7af17a]/20 hover:border-[#7af17a]/40 transition-all"
              >
                <Award className="h-4 w-4 mr-2" />
                Télécharger le certificat
              </Button>
            </Link>
          </div>
        )}

        {/* Module sections */}
        <ScrollArea className="flex-1">
          <div className="py-2">
            {course.modules.map((mod, modIdx) => {
              const isExpanded = expandedModules.has(mod.id);
              const moduleLessonCount = mod.lessons.length;
              const moduleCompletedCount = mod.lessons.filter((l) =>
                completedLessonIds.has(l.id),
              ).length;
              const moduleAllComplete =
                moduleLessonCount > 0 &&
                moduleCompletedCount === moduleLessonCount;
              const modUnlocked = isModuleUnlocked(mod.id, modIdx);
              const modUnlockInfo = getModuleUnlockInfo(mod.id);
              const isJustUnlocked = justUnlockedModules.has(mod.id);
              const moduleProgress =
                moduleLessonCount > 0
                  ? Math.round((moduleCompletedCount / moduleLessonCount) * 100)
                  : 0;

              return (
                <div
                  key={mod.id}
                  className={cn(
                    "transition-all duration-500",
                    isJustUnlocked &&
                      "animate-in fade-in slide-in-from-left-2 duration-500",
                  )}
                >
                  {/* Module header */}
                  <button
                    onClick={() => toggleModule(mod.id)}
                    className={cn(
                      "w-full flex items-center justify-between px-5 py-3.5 transition-all duration-200 group relative",
                      modUnlocked
                        ? "hover:bg-muted/50"
                        : "opacity-50 hover:opacity-60",
                      isJustUnlocked && "bg-brand/5",
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Module status icon — premium sizing with background */}
                      {!modUnlocked ? (
                        <div className="relative shrink-0 flex items-center justify-center w-7 h-7 rounded-lg bg-muted/80 dark:bg-muted/40 border border-border/50">
                          <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                      ) : moduleAllComplete ? (
                        <div className="relative shrink-0 flex items-center justify-center w-7 h-7 rounded-lg bg-brand/15 border border-brand/20">
                          <CheckCircle2 className="h-4 w-4 text-brand" />
                        </div>
                      ) : isJustUnlocked ? (
                        <div className="relative shrink-0 flex items-center justify-center w-7 h-7 rounded-lg bg-brand/15 border border-brand/30 animate-in zoom-in duration-300">
                          <Sparkles className="h-4 w-4 text-brand animate-pulse" />
                        </div>
                      ) : (
                        <div className="relative shrink-0 flex items-center justify-center w-7 h-7 rounded-lg bg-muted/50 dark:bg-muted/30 border border-border/30 group-hover:border-border/60 transition-colors">
                          {isExpanded ? (
                            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
                          )}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <span
                          className={cn(
                            "text-xs font-semibold tracking-wider uppercase truncate block transition-colors",
                            modUnlocked
                              ? "text-foreground/70 group-hover:text-foreground"
                              : "text-muted-foreground",
                            isJustUnlocked && "text-brand",
                          )}
                        >
                          {mod.title}
                        </span>
                        {/* Mini progress bar under module title */}
                        {modUnlocked && moduleLessonCount > 0 && (
                          <div className="h-1 w-full rounded-full bg-muted/60 mt-1.5 overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all duration-700 ease-out",
                                moduleAllComplete ? "bg-brand" : "bg-brand/60",
                              )}
                              style={{ width: `${moduleProgress}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      {moduleAllComplete ? (
                        <Badge className="bg-brand/10 text-brand border-brand/20 text-[10px] px-2 py-0.5 font-semibold gap-1">
                          <Star className="h-2.5 w-2.5 fill-brand" />
                          Termine
                        </Badge>
                      ) : isJustUnlocked ? (
                        <Badge className="bg-brand/10 text-brand border-brand/30 text-[10px] px-2 py-0.5 font-semibold animate-in fade-in duration-500 gap-1">
                          <Sparkles className="h-2.5 w-2.5" />
                          Debloque !
                        </Badge>
                      ) : !modUnlocked ? (
                        <Badge
                          variant="outline"
                          className="text-[10px] px-2 py-0.5 text-muted-foreground border-border/50"
                        >
                          <Lock className="h-2.5 w-2.5 mr-1" />
                          Verrouille
                        </Badge>
                      ) : null}
                      <span
                        className={cn(
                          "text-[10px] tabular-nums",
                          moduleAllComplete
                            ? "text-brand"
                            : "text-muted-foreground",
                        )}
                      >
                        {moduleCompletedCount}/{moduleLessonCount}
                      </span>
                    </div>
                  </button>

                  {/* Module locked banner — premium design */}
                  {!modUnlocked && modUnlockInfo && isExpanded && (
                    <div className="mx-4 mb-3 rounded-xl border border-amber-200/60 bg-gradient-to-br from-amber-50/80 to-orange-50/40 dark:border-amber-900/40 dark:from-amber-950/20 dark:to-orange-950/10 px-4 py-3.5 shadow-sm">
                      <div className="flex items-start gap-3">
                        <div className="shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 border border-amber-200/60 dark:border-amber-800/40 mt-0.5">
                          <ShieldCheck className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-amber-900 dark:text-amber-100">
                            Module verrouille
                          </p>
                          <p className="text-xs text-amber-700/80 dark:text-amber-300/70 mt-1 leading-relaxed">
                            Reussissez le quiz du module precedent avec un score
                            minimum de 90% pour debloquer ce contenu.
                          </p>

                          {/* Score progress bar */}
                          {modUnlockInfo.previousModuleQuizBestScore !== null &&
                            modUnlockInfo.previousModuleQuizBestScore > 0 && (
                              <div className="mt-3 space-y-1.5">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="flex items-center gap-1.5 font-medium text-amber-800 dark:text-amber-200">
                                    <Trophy className="h-3 w-3" />
                                    Votre meilleur score
                                  </span>
                                  <span
                                    className={cn(
                                      "font-bold tabular-nums",
                                      modUnlockInfo.previousModuleQuizBestScore >=
                                        90
                                        ? "text-green-600 dark:text-green-400"
                                        : modUnlockInfo.previousModuleQuizBestScore >=
                                            50
                                          ? "text-amber-600 dark:text-amber-400"
                                          : "text-red-600 dark:text-red-400",
                                    )}
                                  >
                                    {modUnlockInfo.previousModuleQuizBestScore}%
                                  </span>
                                </div>
                                {/* Visual score bar with 90% threshold marker */}
                                <div className="relative h-2 w-full rounded-full bg-amber-200/50 dark:bg-amber-900/30 overflow-hidden">
                                  <div
                                    className={cn(
                                      "h-full rounded-full transition-all duration-500 ease-out",
                                      modUnlockInfo.previousModuleQuizBestScore >=
                                        90
                                        ? "bg-green-500"
                                        : modUnlockInfo.previousModuleQuizBestScore >=
                                            50
                                          ? "bg-amber-500"
                                          : "bg-red-400",
                                    )}
                                    style={{
                                      width: `${modUnlockInfo.previousModuleQuizBestScore}%`,
                                    }}
                                  />
                                  {/* 90% threshold marker */}
                                  <div
                                    className="absolute top-0 bottom-0 w-px bg-amber-800/40 dark:bg-amber-300/40"
                                    style={{ left: "90%" }}
                                  />
                                </div>
                                <p className="text-[10px] text-amber-600/70 dark:text-amber-400/50 text-right">
                                  Seuil requis : 90%
                                </p>
                              </div>
                            )}

                          {/* Remaining attempts pill */}
                          {modUnlockInfo.previousModuleQuizTodayAttempts >
                            0 && (
                            <div className="mt-2.5 flex items-center gap-2">
                              <div
                                className={cn(
                                  "inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full border",
                                  Math.max(
                                    0,
                                    modUnlockInfo.previousModuleQuizMaxAttempts -
                                      modUnlockInfo.previousModuleQuizTodayAttempts,
                                  ) > 0
                                    ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800/40"
                                    : "bg-red-50 text-red-600 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800/40",
                                )}
                              >
                                <Clock className="h-3 w-3" />
                                {Math.max(
                                  0,
                                  modUnlockInfo.previousModuleQuizMaxAttempts -
                                    modUnlockInfo.previousModuleQuizTodayAttempts,
                                ) > 0
                                  ? `${Math.max(0, modUnlockInfo.previousModuleQuizMaxAttempts - modUnlockInfo.previousModuleQuizTodayAttempts)} tentative(s) restante(s)`
                                  : "Revenez demain"}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Just unlocked celebration banner */}
                  {isJustUnlocked && isExpanded && (
                    <div className="mx-4 mb-3 rounded-xl border border-brand/30 bg-gradient-to-br from-brand/5 to-green-50/50 dark:from-brand/5 dark:to-green-950/10 px-4 py-3 shadow-sm animate-in fade-in slide-in-from-top-2 duration-500">
                      <div className="flex items-center gap-3">
                        <div className="shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-brand/15 border border-brand/20">
                          <Sparkles className="h-4 w-4 text-brand animate-pulse" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-brand">
                            Module debloque !
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Felicitations ! Vous pouvez maintenant acceder a ce
                            contenu.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Lesson items */}
                  {isExpanded && (
                    <div
                      className={cn(
                        "pb-2 animate-in fade-in slide-in-from-top-1 duration-200",
                        !modUnlocked && "relative",
                      )}
                    >
                      {/* Subtle overlay for locked module lessons */}
                      {!modUnlocked && (
                        <div className="absolute inset-0 bg-gradient-to-b from-background/0 via-background/20 to-background/40 dark:from-background/0 dark:via-background/10 dark:to-background/30 z-[1] pointer-events-none rounded-b-lg" />
                      )}
                      {mod.lessons.map((lesson, lessonIdx) => {
                        const completed = completedLessonIds.has(lesson.id);
                        const isActive = selectedLessonId === lesson.id;
                        const unlocked = isLessonUnlocked(lesson.id);
                        const isModLocked = !modUnlocked;

                        return (
                          <button
                            key={lesson.id}
                            disabled={!unlocked}
                            onClick={() => selectLesson(lesson.id)}
                            title={
                              isModLocked
                                ? "Reussissez le quiz du module precedent pour debloquer"
                                : !unlocked
                                  ? "Terminez la lecon precedente pour debloquer"
                                  : undefined
                            }
                            className={cn(
                              "w-full flex items-center gap-3 pl-7 pr-4 py-2.5 text-left transition-all duration-200 relative",
                              isActive &&
                                "bg-brand/8 border-l-2 border-brand shadow-[inset_0_0_12px_rgba(122,241,122,0.04)]",
                              !isActive &&
                                unlocked &&
                                "hover:bg-muted/40 hover:pl-8",
                              isModLocked &&
                                "opacity-35 cursor-not-allowed select-none",
                              !isModLocked &&
                                !unlocked &&
                                "opacity-45 cursor-not-allowed",
                            )}
                          >
                            {/* Status icon — larger touch target with refined states */}
                            <span className="shrink-0 flex items-center justify-center w-5 h-5">
                              {completed ? (
                                <CheckCircle2
                                  className={cn(
                                    "h-[18px] w-[18px] text-brand",
                                    isJustUnlocked &&
                                      "animate-in zoom-in duration-300",
                                  )}
                                />
                              ) : isActive ? (
                                <div className="relative">
                                  <Play className="h-4 w-4 text-brand" />
                                  <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
                                </div>
                              ) : unlocked ? (
                                <Circle className="h-4 w-4 text-muted-foreground/60" />
                              ) : isModLocked ? (
                                <Lock className="h-3.5 w-3.5 text-muted-foreground/50" />
                              ) : (
                                <Lock className="h-3.5 w-3.5 text-muted-foreground/70" />
                              )}
                            </span>

                            {/* Title + duration */}
                            <div className="min-w-0 flex-1">
                              <p
                                className={cn(
                                  "text-sm truncate transition-colors",
                                  isActive && "font-medium text-foreground",
                                  completed &&
                                    !isActive &&
                                    "text-muted-foreground line-through decoration-brand/30",
                                  !completed &&
                                    !isActive &&
                                    unlocked &&
                                    "text-foreground/80",
                                )}
                              >
                                {lesson.title}
                              </p>
                              {lesson.duration_minutes && (
                                <span className="text-[11px] text-muted-foreground/70 flex items-center gap-1 mt-0.5">
                                  <Clock className="h-2.5 w-2.5" />
                                  {lesson.duration_minutes} min
                                </span>
                              )}
                            </div>

                            {/* Lesson number for locked lessons (gives a sense of progression) */}
                            {!unlocked && (
                              <span className="text-[10px] text-muted-foreground/40 tabular-nums shrink-0">
                                {modIdx > 0 ? `${modIdx + 1}.` : ""}
                                {lessonIdx + 1}
                              </span>
                            )}
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
    <div className="flex h-[calc(100dvh-4rem)] -m-4 -mb-24 md:-m-8 md:-mb-8">
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
                    Vous devez terminer les cours suivants avant d&apos;acceder
                    a cette formation :
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
              <h1 className="text-2xl font-bold mt-6">
                {selectedLesson.title}
              </h1>

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
                        {markingComplete
                          ? "Enregistrement..."
                          : "Marquer comme termine"}
                      </Button>
                    )
                  )}

                  {/* Quiz button */}
                  {activeQuiz && !completedLessonIds.has(selectedLesson.id) && (
                    <div className="flex flex-col gap-2">
                      <Button
                        variant="outline"
                        className="gap-2 font-semibold"
                        onClick={() => setQuizOpen(true)}
                        disabled={isQuizLocked(selectedLesson.id)}
                      >
                        <Trophy className="h-4 w-4" />
                        Passer le quiz
                      </Button>
                      {activeAttempts && (
                        <div className="flex flex-wrap items-center gap-2">
                          {/* Attempts pill */}
                          <div
                            className={cn(
                              "inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full border",
                              Math.max(
                                0,
                                activeAttempts.maxAttempts -
                                  activeAttempts.todayAttempts,
                              ) > 0
                                ? "bg-muted/50 text-muted-foreground border-border/50"
                                : "bg-red-50 text-red-600 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800/40",
                            )}
                          >
                            <Clock className="h-3 w-3" />
                            {Math.max(
                              0,
                              activeAttempts.maxAttempts -
                                activeAttempts.todayAttempts,
                            )}{" "}
                            tentative(s)
                          </div>
                          {/* Best score pill */}
                          {activeAttempts.bestScore > 0 && (
                            <div
                              className={cn(
                                "inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full border",
                                activeAttempts.bestScore >= 90
                                  ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800/40"
                                  : activeAttempts.bestScore >= 50
                                    ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800/40"
                                    : "bg-red-50 text-red-600 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800/40",
                              )}
                            >
                              <Trophy className="h-3 w-3" />
                              {activeAttempts.bestScore}%
                              {activeAttempts.bestScore < 90 && (
                                <span className="text-[10px] opacity-70">
                                  /90%
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                      {isQuizLocked(selectedLesson.id) && (
                        <div className="text-xs text-amber-600 flex items-center gap-1.5 font-medium">
                          <Clock className="h-3 w-3" />
                          <span>Plus de tentatives aujourd&apos;hui.</span>
                          <CountdownToMidnight />
                        </div>
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
                          flatLessons[selectedLessonIndex + 1]?.id ?? "",
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
                                  "border-red-500 bg-red-50 dark:bg-red-950/20",
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

                  {/* Quiz results — premium design with score ring */}
                  {quizSubmitted && quizScore !== null && (
                    <div
                      className={cn(
                        "mt-6 rounded-xl border-2 p-5 animate-in fade-in slide-in-from-bottom-2 duration-300",
                        quizScore >= (activeQuiz.passing_score || 90)
                          ? "border-green-200 bg-gradient-to-br from-green-50/80 to-emerald-50/40 dark:border-green-900 dark:from-green-950/20 dark:to-emerald-950/10"
                          : "border-red-200 bg-gradient-to-br from-red-50/80 to-orange-50/40 dark:border-red-900 dark:from-red-950/20 dark:to-orange-950/10",
                      )}
                    >
                      <div className="flex items-center gap-5">
                        {/* Score ring */}
                        <div className="relative shrink-0 w-16 h-16">
                          <svg
                            className="w-16 h-16 -rotate-90"
                            viewBox="0 0 64 64"
                          >
                            <circle
                              cx="32"
                              cy="32"
                              r="28"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="4"
                              className="text-muted/30"
                            />
                            <circle
                              cx="32"
                              cy="32"
                              r="28"
                              fill="none"
                              strokeWidth="4"
                              strokeLinecap="round"
                              strokeDasharray={`${(quizScore / 100) * 175.9} 175.9`}
                              className={cn(
                                "transition-all duration-1000 ease-out",
                                quizScore >= (activeQuiz.passing_score || 90)
                                  ? "stroke-green-500"
                                  : "stroke-red-400",
                              )}
                            />
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span
                              className={cn(
                                "text-lg font-bold tabular-nums leading-none",
                                quizScore >= (activeQuiz.passing_score || 90)
                                  ? "text-green-600 dark:text-green-400"
                                  : "text-red-500 dark:text-red-400",
                              )}
                            >
                              {quizScore}%
                            </span>
                          </div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {quizScore >= (activeQuiz.passing_score || 90) ? (
                              <Trophy className="h-5 w-5 text-green-600 shrink-0" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-500 shrink-0" />
                            )}
                            <p className="font-bold text-lg">
                              {quizScore >= (activeQuiz.passing_score || 90)
                                ? "Quiz reussi !"
                                : "Quiz non valide"}
                            </p>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {quizScore >= (activeQuiz.passing_score || 90)
                              ? "Felicitations ! Vous avez reussi le quiz et debloque la suite."
                              : `Score minimum requis : ${activeQuiz.passing_score || 90}%. Revisez la lecon et reessayez.`}
                          </p>
                          {quizScore >= (activeQuiz.passing_score || 90) &&
                            (courseCompleted ? (
                              <div className="mt-3 p-3 rounded-lg bg-gradient-to-r from-brand/10 to-emerald-500/10 border border-brand/20">
                                <p className="text-sm font-bold text-brand flex items-center gap-2">
                                  <Sparkles className="h-4 w-4" />
                                  Formation terminee !
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Vous avez complete toutes les lecons et quiz
                                  de ce cours. Bravo !
                                </p>
                                <Link
                                  href="/academy"
                                  className="inline-flex items-center gap-1.5 mt-2 text-xs font-medium text-brand hover:underline"
                                >
                                  Retour a l&apos;Academy
                                </Link>
                              </div>
                            ) : (
                              <p className="text-xs text-green-600 dark:text-green-400 mt-1.5 flex items-center gap-1.5 font-medium">
                                <Sparkles className="h-3 w-3" />
                                Module suivant debloque
                              </p>
                            ))}
                        </div>
                      </div>

                      {/* Question results detail */}
                      <div className="mt-5 pt-4 border-t border-border/50 space-y-1.5">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                          Détail des réponses
                        </p>
                        {activeQuiz.questions.map((q, qi) => {
                          const isCorrect = quizAnswers[qi] === q.correct_index;
                          return (
                            <div
                              key={qi}
                              className={cn(
                                "flex items-center gap-2.5 text-sm py-1 px-2 rounded-md -mx-1",
                                isCorrect
                                  ? "bg-green-50/50 dark:bg-green-950/10"
                                  : "bg-red-50/50 dark:bg-red-950/10",
                              )}
                            >
                              {isCorrect ? (
                                <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />
                              ) : (
                                <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                              )}
                              <span
                                className={cn(
                                  "truncate",
                                  isCorrect
                                    ? "text-green-700 dark:text-green-400"
                                    : "text-red-600 dark:text-red-400",
                                )}
                              >
                                Q{qi + 1}: {q.question.slice(0, 60)}
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
                          {submitting ? "Envoi en cours..." : "Valider le quiz"}
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
                          quizScore < (activeQuiz.passing_score || 90) &&
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
    return (
      parseFloat(localStorage.getItem(`video-pos:${lessonId}`) || "0") || 0
    );
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

function getStoredPlaybackSpeed(): number {
  try {
    const stored = localStorage.getItem("academy-playback-speed");
    if (stored) {
      const speed = parseFloat(stored);
      if (PLAYBACK_SPEEDS.includes(speed)) return speed;
    }
  } catch {
    // ignore
  }
  return 1;
}

function storePlaybackSpeed(speed: number) {
  try {
    localStorage.setItem("academy-playback-speed", String(speed));
  } catch {
    // quota exceeded
  }
}

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
  const [playbackSpeed, setPlaybackSpeed] = useState(() =>
    getStoredPlaybackSpeed(),
  );
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
      if (
        (e.target as HTMLElement).tagName === "INPUT" ||
        (e.target as HTMLElement).tagName === "TEXTAREA"
      )
        return;

      switch (e.key) {
        case " ":
        case "k":
          e.preventDefault();
          if (video.paused) {
            video.play();
          } else {
            video.pause();
          }
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
              const newSpeed = PLAYBACK_SPEEDS[idx + 1];
              setPlaybackSpeed(newSpeed);
              storePlaybackSpeed(newSpeed);
            }
          }
          break;
        case "<":
          e.preventDefault();
          {
            const idx = PLAYBACK_SPEEDS.indexOf(playbackSpeed);
            if (idx > 0) {
              const newSpeed = PLAYBACK_SPEEDS[idx - 1];
              setPlaybackSpeed(newSpeed);
              storePlaybackSpeed(newSpeed);
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
            Reprendre à {Math.floor(resumeTime / 60)}:
            {String(Math.floor(resumeTime % 60)).padStart(2, "0")}
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
                    storePlaybackSpeed(speed);
                    setShowSpeedMenu(false);
                  }}
                  className={cn(
                    "block w-full text-left px-3 py-1.5 rounded text-xs transition-colors",
                    speed === playbackSpeed
                      ? "bg-brand/10 text-brand font-medium"
                      : "hover:bg-muted text-foreground",
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

// ─── Countdown to midnight ───────────────────────────────────

function CountdownToMidnight() {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    function compute() {
      const now = new Date();
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0);
      const diff = midnight.getTime() - now.getTime();
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(
        `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`,
      );
    }

    compute();
    const interval = setInterval(compute, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!timeLeft) return null;

  return (
    <span className="font-mono tabular-nums text-amber-600">
      Prochaine tentative dans {timeLeft}
    </span>
  );
}
