"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { aiJSON } from "@/lib/ai/client";
import { notifyMany } from "@/lib/actions/notifications";

export async function getCourseWithPrerequisites(
  courseId: string,
  userId: string,
) {
  const supabase = await createClient();

  const { data: course } = await supabase
    .from("courses")
    .select("*")
    .eq("id", courseId)
    .single();

  if (!course) return null;

  // Check prerequisites
  const { data: prerequisites } = await supabase
    .from("course_prerequisites")
    .select(
      "prerequisite_course_id, courses!course_prerequisites_prerequisite_course_id_fkey(title)",
    )
    .eq("course_id", courseId);

  const prereqStatus = await Promise.all(
    (prerequisites || []).map(async (p: Record<string, unknown>) => {
      const courses = p.courses;
      const prereqCourseTitle = Array.isArray(courses)
        ? (courses[0] as Record<string, unknown>)?.title
        : (courses as Record<string, unknown>)?.title;

      // Check if user completed the prerequisite course
      const { data: lessons } = await supabase
        .from("lessons")
        .select("id")
        .eq("course_id", p.prerequisite_course_id as string);

      const lessonIds = (lessons || []).map((l) => l.id);

      if (lessonIds.length === 0)
        return {
          courseId: p.prerequisite_course_id as string,
          title: (prereqCourseTitle as string) || "Cours requis",
          completed: false,
        };

      const { data: completed } = await supabase
        .from("lesson_progress")
        .select("id")
        .eq("user_id", userId)
        .eq("completed", true)
        .in("lesson_id", lessonIds);

      return {
        courseId: p.prerequisite_course_id as string,
        title: (prereqCourseTitle as string) || "Cours requis",
        completed: (completed || []).length >= lessonIds.length,
      };
    }),
  );

  const allPrereqsMet = prereqStatus.every((p) => p.completed);

  return { course, prerequisites: prereqStatus, allPrereqsMet };
}

export async function submitQuizAttempt(
  quizId: string,
  lessonId: string,
  answers: Record<number, number>,
  score: number,
  passed: boolean,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifie");

  // Server-side score verification: fetch quiz questions and recompute
  const { data: quizData } = await supabase
    .from("quizzes")
    .select("questions, max_attempts_per_day")
    .eq("id", quizId)
    .single();

  const maxAttempts = quizData?.max_attempts_per_day || 3;

  // Recompute score server-side to prevent client manipulation
  let verifiedScore = score;
  let verifiedPassed = passed;
  if (
    quizData?.questions &&
    Array.isArray(quizData.questions) &&
    quizData.questions.length > 0
  ) {
    const questions = quizData.questions as Array<{
      correct_index?: number;
      correctIndex?: number;
    }>;
    let correct = 0;
    for (let i = 0; i < questions.length; i++) {
      const correctIdx =
        questions[i].correct_index ?? questions[i].correctIndex;
      if (answers[i] === correctIdx) correct++;
    }
    verifiedScore = Math.round((correct / questions.length) * 100);
    verifiedPassed = verifiedScore >= 90;
  }

  // Check attempts today
  const today = new Date().toISOString().split("T")[0];
  const { data: todayAttempts } = await supabase
    .from("quiz_attempts")
    .select("id")
    .eq("user_id", user.id)
    .eq("lesson_id", lessonId)
    .gte("attempted_at", `${today}T00:00:00.000Z`);

  if ((todayAttempts || []).length >= maxAttempts) {
    throw new Error(`Maximum ${maxAttempts} tentatives par jour atteint`);
  }

  await supabase.from("quiz_attempts").insert({
    user_id: user.id,
    quiz_id: quizId,
    lesson_id: lessonId,
    answers,
    score: verifiedScore,
    passed: verifiedPassed,
  });

  revalidatePath("/academy");
  return {
    attemptsLeft: maxAttempts - (todayAttempts || []).length - 1,
    score: verifiedScore,
    passed: verifiedPassed,
  };
}

export async function getQuizAttempts(lessonId: string, userId: string) {
  const supabase = await createClient();

  const today = new Date().toISOString().split("T")[0];
  const { data: attempts } = await supabase
    .from("quiz_attempts")
    .select("*")
    .eq("user_id", userId)
    .eq("lesson_id", lessonId)
    .order("attempted_at", { ascending: false });

  const todayAttempts = (attempts || []).filter(
    (a) => a.attempted_at >= `${today}T00:00:00.000Z`,
  );

  return {
    allAttempts: attempts || [],
    todayAttempts: todayAttempts.length,
    bestScore: Math.max(0, ...(attempts || []).map((a) => a.score ?? 0)),
  };
}

export async function getQuizAttemptsToday(quizId: string): Promise<number> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;

  const today = new Date().toISOString().split("T")[0];
  const { data: todayAttempts } = await supabase
    .from("quiz_attempts")
    .select("id")
    .eq("user_id", user.id)
    .eq("quiz_id", quizId)
    .gte("attempted_at", `${today}T00:00:00.000Z`);

  return (todayAttempts || []).length;
}

export async function getResourceLibrary() {
  const supabase = await createClient();

  const { data: resources } = await supabase
    .from("resource_library")
    .select("*")
    .order("created_at", { ascending: false });

  return resources || [];
}

export async function getRevisionCards(courseId?: string) {
  const supabase = await createClient();

  let query = supabase
    .from("revision_cards")
    .select("*, lessons(title, course_id)");

  if (courseId) {
    // Get lesson ids for the course first
    const { data: lessons } = await supabase
      .from("lessons")
      .select("id")
      .eq("course_id", courseId);

    if (lessons && lessons.length > 0) {
      query = query.in(
        "lesson_id",
        lessons.map((l) => l.id),
      );
    }
  }

  const { data: cards } = await query.order("created_at");
  return (cards || []).map((c: Record<string, unknown>) => ({
    ...c,
    lessons: Array.isArray(c.lessons) ? c.lessons[0] || null : c.lessons,
  }));
}

export async function aiCorrectExercise(
  exerciseText: string,
  userAnswer: string,
) {
  try {
    const result = await aiJSON<{
      score: number;
      feedback: string;
      suggestions: string[];
    }>(
      `Tu es un formateur expert en vente et setting. Corrige cet exercice.

EXERCICE :
${exerciseText}

RÉPONSE DE L'ÉLÈVE :
${userAnswer}

Évalue la réponse et réponds en JSON :
{
  "score": <number 0-100>,
  "feedback": "<feedback détaillé en 2-3 phrases : ce qui est bien + ce qui manque>",
  "suggestions": ["<suggestion concrète 1>", "<suggestion concrète 2>", "<suggestion concrète 3>"]
}

Sois constructif mais exigeant. Le score doit refléter la qualité réelle de la réponse.`,
      {
        system:
          "Tu es un coach expert en vente/setting chez S Academy. Réponds uniquement en français.",
      },
    );
    return result;
  } catch {
    return {
      score: 0,
      feedback:
        "Correction IA indisponible — réessayez dans quelques instants. Vérifiez la configuration de l'API IA.",
      suggestions: [],
    };
  }
}

export async function getCoursesWithModules() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: courses } = await supabase
    .from("courses")
    .select(
      "*, modules:course_modules(*, lessons:lessons(id, title, position, duration_minutes, video_url))",
    )
    .eq("is_published", true)
    .order("position", { ascending: true });

  // Get user progress if authenticated
  let progressMap: Record<string, boolean> = {};
  if (user) {
    const { data: progress } = await supabase
      .from("lesson_progress")
      .select("lesson_id, completed")
      .eq("user_id", user.id)
      .eq("completed", true);

    if (progress) {
      progressMap = Object.fromEntries(
        progress.map((p: { lesson_id: string }) => [p.lesson_id, true]),
      );
    }
  }

  const sortedCourses = (courses || []).map((c: Record<string, unknown>) => ({
    ...c,
    modules: Array.isArray(c.modules)
      ? (c.modules as Record<string, unknown>[])
          .sort((a, b) => (a.position as number) - (b.position as number))
          .map((m) => ({
            ...m,
            lessons: Array.isArray(m.lessons)
              ? (m.lessons as Record<string, unknown>[]).sort(
                  (a, b) => (a.position as number) - (b.position as number),
                )
              : [],
          }))
      : [],
  }));

  // Compute module unlock counts per course for the grid display
  const moduleUnlockCounts: Record<
    string,
    { unlocked: number; total: number }
  > = {};
  if (user) {
    // Gather all lesson IDs across all courses to batch-fetch quizzes & attempts
    const allLessonIds: string[] = [];
    for (const c of sortedCourses) {
      for (const m of c.modules as Array<{ lessons: Array<{ id: string }> }>) {
        for (const l of m.lessons) {
          allLessonIds.push(l.id);
        }
      }
    }

    if (allLessonIds.length > 0) {
      const { data: quizzes } = await supabase
        .from("quizzes")
        .select("id, lesson_id")
        .in("lesson_id", allLessonIds);

      const quizLessonIds = new Set((quizzes || []).map((q) => q.lesson_id));

      const { data: attempts } = await supabase
        .from("quiz_attempts")
        .select("lesson_id, score")
        .eq("user_id", user.id)
        .in("lesson_id", allLessonIds);

      // Best score per lesson
      const bestScoreByLesson: Record<string, number> = {};
      for (const a of attempts || []) {
        bestScoreByLesson[a.lesson_id] = Math.max(
          bestScoreByLesson[a.lesson_id] || 0,
          a.score ?? 0,
        );
      }

      for (const c of sortedCourses) {
        const courseId = (c as Record<string, unknown>).id as string;
        const mods = c.modules as Array<{
          id: string;
          lessons: Array<{ id: string; position: number }>;
        }>;
        let unlockedCount = 0;
        for (let i = 0; i < mods.length; i++) {
          if (i === 0) {
            unlockedCount++;
            continue;
          }
          // Find gate lesson (last lesson with quiz) in previous module
          const prevMod = mods[i - 1];
          const sortedLessons = [...prevMod.lessons].sort(
            (a, b) => a.position - b.position,
          );
          let gateLessonId: string | null = null;
          for (let j = sortedLessons.length - 1; j >= 0; j--) {
            if (quizLessonIds.has(sortedLessons[j].id)) {
              gateLessonId = sortedLessons[j].id;
              break;
            }
          }
          if (!gateLessonId) {
            // No quiz in previous module = unlocked by default
            unlockedCount++;
          } else if ((bestScoreByLesson[gateLessonId] || 0) >= 90) {
            unlockedCount++;
          } else {
            break; // Sequential: if one is locked, all after are locked too
          }
        }
        moduleUnlockCounts[courseId] = {
          unlocked: unlockedCount,
          total: mods.length,
        };
      }
    }
  }

  return {
    courses: sortedCourses,
    progressMap,
    moduleUnlockCounts,
  };
}

export async function getCourseDetail(courseId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Fetch course with modules and lessons
  const { data: course } = await supabase
    .from("courses")
    .select("*, modules:course_modules(*, lessons:lessons(*))")
    .eq("id", courseId)
    .single();

  if (!course) return null;

  // Sort modules and lessons by position
  const modules = Array.isArray(course.modules)
    ? (course.modules as Record<string, unknown>[])
        .sort((a, b) => (a.position as number) - (b.position as number))
        .map((m) => ({
          ...m,
          lessons: Array.isArray(m.lessons)
            ? (m.lessons as Record<string, unknown>[]).sort(
                (a, b) => (a.position as number) - (b.position as number),
              )
            : [],
        }))
    : [];

  // Get all lesson IDs
  const lessonIds = modules.flatMap((m) =>
    (m.lessons as Array<{ id: string }>).map((l) => l.id),
  );

  // Fetch progress
  const { data: progress } = await supabase
    .from("lesson_progress")
    .select("*")
    .eq("user_id", user.id)
    .in("lesson_id", lessonIds.length > 0 ? lessonIds : ["none"]);

  const progressMap: Record<
    string,
    { completed: boolean; quiz_score: number | null }
  > = {};
  if (progress) {
    for (const p of progress) {
      progressMap[p.lesson_id] = {
        completed: p.completed,
        quiz_score: p.quiz_score,
      };
    }
  }

  // Fetch quizzes
  const { data: quizzes } = await supabase
    .from("quizzes")
    .select("*")
    .in("lesson_id", lessonIds.length > 0 ? lessonIds : ["none"]);

  const quizMap: Record<string, Record<string, unknown>> = {};
  if (quizzes) {
    for (const q of quizzes) {
      quizMap[q.lesson_id] = q;
    }
  }

  // Fetch prerequisites
  const { data: prereqs } = await supabase
    .from("course_prerequisites")
    .select("*, prerequisite:courses!prerequisite_course_id(id, title)")
    .eq("course_id", courseId);

  let allPrereqsMet = true;
  const prerequisites = await Promise.all(
    (prereqs || []).map(async (p: Record<string, unknown>) => {
      const prereqCourseId = p.prerequisite_course_id as string;

      // Fetch all lessons of the prerequisite course
      const { data: prereqLessons } = await supabase
        .from("lessons")
        .select("id")
        .eq("course_id", prereqCourseId);

      const prereqLessonIds = (prereqLessons || []).map((l) => l.id);

      if (prereqLessonIds.length === 0) {
        return { ...p, completed: true };
      }

      // Check if ALL lessons of the prerequisite course are completed
      const { data: completedLessons } = await supabase
        .from("lesson_progress")
        .select("id")
        .eq("user_id", user.id)
        .eq("completed", true)
        .in("lesson_id", prereqLessonIds);

      const completed =
        (completedLessons || []).length >= prereqLessonIds.length;
      if (!completed) allPrereqsMet = false;
      return { ...p, completed };
    }),
  );

  // Check roleplay prerequisite
  const roleplayCheck = await checkRoleplayPrerequisite(courseId, user.id);
  if (roleplayCheck.required && !roleplayCheck.met) {
    allPrereqsMet = false;
  }

  return {
    course: { ...course, modules },
    progressMap,
    quizMap,
    prerequisites,
    allPrereqsMet,
    roleplayPrerequisite: roleplayCheck,
  };
}

export async function markLessonComplete(lessonId: string, quizScore?: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const upsertData: Record<string, unknown> = {
    user_id: user.id,
    lesson_id: lessonId,
    completed: true,
    completed_at: new Date().toISOString(),
  };
  if (quizScore !== undefined) {
    upsertData.quiz_score = quizScore;
  }

  const { error } = await supabase
    .from("lesson_progress")
    .upsert(upsertData, { onConflict: "user_id,lesson_id" });

  if (error) throw new Error(error.message);

  // Award gamification points for lesson completion
  try {
    const { addPoints, updateChallengeProgress, checkBadgeEligibility } =
      await import("@/lib/actions/gamification");
    await addPoints(user.id, 15, "Leçon complétée");
    await updateChallengeProgress(user.id, "lessons_completed", 1);

    // Check if the whole course is now complete
    const { data: lesson } = await supabase
      .from("lessons")
      .select("course_id")
      .eq("id", lessonId)
      .single();

    if (lesson?.course_id) {
      const { data: allLessons } = await supabase
        .from("lessons")
        .select("id")
        .eq("course_id", lesson.course_id);

      const { data: completedLessons } = await supabase
        .from("lesson_progress")
        .select("id")
        .eq("user_id", user.id)
        .eq("completed", true)
        .in(
          "lesson_id",
          (allLessons || []).map((l) => l.id),
        );

      if (
        allLessons &&
        completedLessons &&
        completedLessons.length >= allLessons.length
      ) {
        await addPoints(user.id, 50, "Cours complété !");
        await updateChallengeProgress(user.id, "courses_completed", 1);
      }
    }

    await checkBadgeEligibility(user.id);
  } catch {
    // Non-blocking: don't fail lesson completion if gamification errors
  }

  revalidatePath("/academy");
}

/**
 * Generate a fresh set of quiz questions using AI based on lesson content.
 * This ensures tests are auto-regenerated and never repetitive.
 */
export async function generateQuizQuestions(
  lessonId: string,
  count: number = 5,
): Promise<
  Array<{
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  }>
> {
  const supabase = await createClient();

  // Get lesson + course context
  const { data: lesson } = await supabase
    .from("lessons")
    .select("title, content, courses(title)")
    .eq("id", lessonId)
    .single();

  const courseTitle = lesson?.courses
    ? Array.isArray(lesson.courses)
      ? (lesson.courses[0] as { title: string })?.title
      : (lesson.courses as { title: string }).title
    : "Formation";

  // Get previous attempts to avoid repetition
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: pastAttempts } = user
    ? await supabase
        .from("quiz_attempts")
        .select("answers")
        .eq("user_id", user.id)
        .eq("lesson_id", lessonId)
        .order("attempted_at", { ascending: false })
        .limit(3)
    : { data: null };

  const pastContext =
    pastAttempts && pastAttempts.length > 0
      ? `\nL'apprenant a déjà passé ${pastAttempts.length} tentatives. Génère des questions DIFFÉRENTES de celles qu'il a déjà vues.`
      : "";

  try {
    const result = await aiJSON<{
      questions: Array<{
        question: string;
        options: string[];
        correctIndex: number;
        explanation: string;
      }>;
    }>(
      `Génère ${count} questions de quiz pour tester la compréhension de cette leçon.

COURS : ${courseTitle}
LEÇON : ${lesson?.title || "Sans titre"}
CONTENU : ${(lesson?.content || "Leçon sur le setting et la vente").substring(0, 2000)}
${pastContext}

Réponds en JSON :
{
  "questions": [
    {
      "question": "question claire et précise",
      "options": ["option A", "option B", "option C", "option D"],
      "correctIndex": 0,
      "explanation": "explication courte de pourquoi c'est la bonne réponse"
    }
  ]
}

Règles :
- 4 options par question, une seule correcte
- Questions variées : compréhension, application, mise en situation
- Niveau adapté à des setters en formation
- En français, tutoiement`,
      {
        system:
          "Tu es un formateur expert en vente/setting chez S Academy. Tu crées des quiz pédagogiques.",
      },
    );
    return result.questions;
  } catch {
    throw new Error(
      "Génération de quiz indisponible — vérifiez la configuration de l'API IA.",
    );
  }
}

/**
 * Get detailed quiz results with question-by-question breakdown
 */
export async function getDetailedQuizResults(attemptId: string) {
  const supabase = await createClient();

  const { data: attempt } = await supabase
    .from("quiz_attempts")
    .select("*, quizzes(title, questions)")
    .eq("id", attemptId)
    .single();

  if (!attempt) return null;

  const quiz = Array.isArray(attempt.quizzes)
    ? attempt.quizzes[0]
    : attempt.quizzes;
  const questions =
    ((quiz as Record<string, unknown>)?.questions as Array<{
      question: string;
      options: string[];
      correctIndex: number;
      explanation?: string;
    }>) || [];

  const userAnswers = (attempt.answers || {}) as Record<number, number>;

  const breakdown = questions.map((q, i) => ({
    question: q.question,
    options: q.options,
    correctIndex: q.correctIndex,
    userAnswer: userAnswers[i] ?? -1,
    isCorrect: userAnswers[i] === q.correctIndex,
    explanation: q.explanation || null,
  }));

  const correctCount = breakdown.filter((b) => b.isCorrect).length;

  return {
    score: attempt.score,
    passed: attempt.passed,
    totalQuestions: questions.length,
    correctCount,
    breakdown,
    attemptedAt: attempt.attempted_at,
  };
}

export async function trackVideoProgress(
  lessonId: string,
  watchedPercent: number,
) {
  if (watchedPercent < 80) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  // Check if already completed
  const { data: existing } = await supabase
    .from("lesson_progress")
    .select("completed")
    .eq("user_id", user.id)
    .eq("lesson_id", lessonId)
    .single();

  if (existing?.completed) return;

  await supabase.from("lesson_progress").upsert(
    {
      user_id: user.id,
      lesson_id: lessonId,
      completed: true,
      completed_at: new Date().toISOString(),
    },
    { onConflict: "user_id,lesson_id" },
  );

  revalidatePath("/academy");
}

/**
 * Check if user has met the roleplay score requirement to access a course.
 * Some courses require a minimum roleplay score of 75/100.
 */
export async function checkRoleplayPrerequisite(
  courseId: string,
  userId: string,
): Promise<{
  required: boolean;
  met: boolean;
  bestScore: number;
  requiredScore: number;
}> {
  const supabase = await createClient();

  // Check if this course has a roleplay requirement (stored in course metadata)
  const { data: course } = await supabase
    .from("courses")
    .select("metadata")
    .eq("id", courseId)
    .single();

  const metadata = (course?.metadata || {}) as Record<string, unknown>;
  const requiredScore = (metadata.min_roleplay_score as number) || 0;

  if (requiredScore === 0) {
    return { required: false, met: true, bestScore: 0, requiredScore: 0 };
  }

  // Get user's best roleplay score
  const { data: sessions } = await supabase
    .from("roleplay_sessions")
    .select("score")
    .eq("user_id", userId)
    .eq("status", "completed")
    .not("score", "is", null)
    .order("score", { ascending: false })
    .limit(1);

  const bestScore =
    sessions && sessions.length > 0 ? sessions[0].score || 0 : 0;

  return {
    required: true,
    met: bestScore >= requiredScore,
    bestScore,
    requiredScore,
  };
}

/**
 * Admin function: set roleplay score requirement on a course.
 */
export async function setRoleplayRequirement(
  courseId: string,
  minScore: number,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifie");

  const { data: course } = await supabase
    .from("courses")
    .select("metadata")
    .eq("id", courseId)
    .single();

  const currentMetadata = (course?.metadata || {}) as Record<string, unknown>;

  await supabase
    .from("courses")
    .update({
      metadata: { ...currentMetadata, min_roleplay_score: minScore },
    })
    .eq("id", courseId);

  revalidatePath("/academy");
}

// ---------------------------------------------------------------------------
// Module locking — modules unlock sequentially based on quiz scores
// ---------------------------------------------------------------------------

/**
 * Returns unlock status for every module in a course.
 * Module 0 is always unlocked. Module N is unlocked only if the user's best
 * quiz score for module N-1's *last lesson quiz* is >= 90%.
 * Also returns daily attempt info so the UI can show remaining attempts.
 */
export async function getModuleUnlockStatus(courseId: string): Promise<{
  moduleStatus: Record<
    string,
    {
      unlocked: boolean;
      previousModuleQuizPassed: boolean;
      previousModuleQuizBestScore: number | null;
      previousModuleQuizTodayAttempts: number;
      previousModuleQuizMaxAttempts: number;
      previousModuleTitle: string | null;
    }
  >;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { moduleStatus: {} };

    // Fetch course modules with their lessons (need quiz info)
    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select(
        "modules:course_modules(id, title, position, lessons:lessons(id, position))",
      )
      .eq("id", courseId)
      .single();

    if (courseError || !course) return { moduleStatus: {} };

    const modules = Array.isArray(course.modules)
      ? (
          course.modules as Array<{
            id: string;
            title: string;
            position: number;
            lessons: Array<{ id: string; position: number }> | null;
          }>
        )
          .map((m) => ({
            ...m,
            lessons: Array.isArray(m.lessons) ? m.lessons : [],
          }))
          .sort((a, b) => a.position - b.position)
      : [];

    if (modules.length === 0) return { moduleStatus: {} };

    // Collect all lesson IDs to batch-fetch quizzes and attempts
    const allLessonIds = modules.flatMap((m) => m.lessons.map((l) => l.id));
    if (allLessonIds.length === 0) return { moduleStatus: {} };

    // Fetch all quizzes for lessons in this course
    const { data: quizzes } = await supabase
      .from("quizzes")
      .select("id, lesson_id, max_attempts_per_day")
      .in("lesson_id", allLessonIds);

    const quizByLessonId: Record<
      string,
      { id: string; max_attempts_per_day: number }
    > = {};
    for (const q of quizzes || []) {
      quizByLessonId[q.lesson_id] = {
        id: q.id,
        max_attempts_per_day: q.max_attempts_per_day || 3,
      };
    }

    // Fetch all quiz attempts for this user in this course
    const { data: attempts } = await supabase
      .from("quiz_attempts")
      .select("lesson_id, score, attempted_at")
      .eq("user_id", user.id)
      .in("lesson_id", allLessonIds)
      .order("attempted_at", { ascending: false });

    const today = new Date().toISOString().split("T")[0];

    // Helper: get best score and today attempts for a specific lesson
    function getAttemptInfo(lessonId: string) {
      const lessonAttempts = (attempts || []).filter(
        (a) => a.lesson_id === lessonId,
      );
      const todayAttempts = lessonAttempts.filter(
        (a) => a.attempted_at >= `${today}T00:00:00.000Z`,
      );
      const bestScore =
        lessonAttempts.length > 0
          ? Math.max(0, ...lessonAttempts.map((a) => a.score ?? 0))
          : 0;
      return { bestScore, todayAttempts: todayAttempts.length };
    }

    // For each module, find its "gate quiz" — the quiz on the last lesson of the module
    // that must be passed to unlock the next module
    function getModuleGateLesson(mod: (typeof modules)[number]): string | null {
      const sortedLessons = [...mod.lessons].sort(
        (a, b) => a.position - b.position,
      );
      // Find the last lesson that has a quiz
      for (let i = sortedLessons.length - 1; i >= 0; i--) {
        if (quizByLessonId[sortedLessons[i].id]) {
          return sortedLessons[i].id;
        }
      }
      return null;
    }

    const moduleStatus: Record<
      string,
      {
        unlocked: boolean;
        previousModuleQuizPassed: boolean;
        previousModuleQuizBestScore: number | null;
        previousModuleQuizTodayAttempts: number;
        previousModuleQuizMaxAttempts: number;
        previousModuleTitle: string | null;
      }
    > = {};

    for (let i = 0; i < modules.length; i++) {
      const mod = modules[i];

      if (i === 0) {
        // First module is always unlocked
        moduleStatus[mod.id] = {
          unlocked: true,
          previousModuleQuizPassed: true,
          previousModuleQuizBestScore: null,
          previousModuleQuizTodayAttempts: 0,
          previousModuleQuizMaxAttempts: 3,
          previousModuleTitle: null,
        };
        continue;
      }

      const prevModule = modules[i - 1];
      const gateLessonId = getModuleGateLesson(prevModule);

      if (!gateLessonId) {
        // Previous module has no quiz — module is unlocked by default
        moduleStatus[mod.id] = {
          unlocked: true,
          previousModuleQuizPassed: true,
          previousModuleQuizBestScore: null,
          previousModuleQuizTodayAttempts: 0,
          previousModuleQuizMaxAttempts: 3,
          previousModuleTitle: prevModule.title,
        };
        continue;
      }

      const quizInfo = quizByLessonId[gateLessonId];
      const attemptInfo = getAttemptInfo(gateLessonId);
      const passed = attemptInfo.bestScore >= 90;

      moduleStatus[mod.id] = {
        unlocked: passed,
        previousModuleQuizPassed: passed,
        previousModuleQuizBestScore:
          attemptInfo.bestScore > 0 ? attemptInfo.bestScore : null,
        previousModuleQuizTodayAttempts: attemptInfo.todayAttempts,
        previousModuleQuizMaxAttempts: quizInfo.max_attempts_per_day,
        previousModuleTitle: prevModule.title,
      };
    }

    return { moduleStatus };
  } catch (error) {
    // Graceful fallback: if tables don't exist, lock everything by default (safer)
    console.error(
      "[getModuleUnlockStatus] Error fetching module status:",
      error,
    );
    return { moduleStatus: {} };
  }
}

// --- Feature F32.6: Micro-learning ---

export async function getMicroLessons() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  // Fetch all published courses with their modules and lessons
  const { data: courses } = await supabase
    .from("courses")
    .select(
      "id, title, modules:course_modules(id, title, lessons:lessons(id, title, content, duration_minutes, position, type))",
    )
    .eq("is_published", true)
    .order("position", { ascending: true });

  if (!courses || courses.length === 0)
    return { microLessons: [], progressMap: {} };

  // Flatten and filter micro lessons (duration <= 5 or null)
  const microLessons: Array<{
    id: string;
    title: string;
    content: string | null;
    duration_minutes: number | null;
    type: string | null;
    position: number;
    course_id: string;
    course_title: string;
    module_title: string;
  }> = [];

  for (const course of courses) {
    const modules = Array.isArray(course.modules) ? course.modules : [];
    for (const mod of modules as Array<{
      id: string;
      title: string;
      lessons: Array<{
        id: string;
        title: string;
        content: string | null;
        duration_minutes: number | null;
        position: number;
        type: string | null;
      }>;
    }>) {
      const lessons = Array.isArray(mod.lessons) ? mod.lessons : [];
      for (const lesson of lessons) {
        if (lesson.duration_minutes === null || lesson.duration_minutes <= 5) {
          microLessons.push({
            id: lesson.id,
            title: lesson.title,
            content: lesson.content,
            duration_minutes: lesson.duration_minutes,
            type: lesson.type,
            position: lesson.position,
            course_id: course.id,
            course_title: course.title,
            module_title: mod.title,
          });
        }
      }
    }
  }

  // Fetch completion status
  const lessonIds = microLessons.map((l) => l.id);
  let progressMap: Record<string, boolean> = {};
  if (lessonIds.length > 0) {
    const { data: progress } = await supabase
      .from("lesson_progress")
      .select("lesson_id, completed")
      .eq("user_id", user.id)
      .eq("completed", true)
      .in("lesson_id", lessonIds);

    if (progress) {
      progressMap = Object.fromEntries(
        progress.map((p: { lesson_id: string }) => [p.lesson_id, true]),
      );
    }
  }

  return { microLessons, progressMap };
}

export async function getDailyMicroLesson() {
  const { microLessons, progressMap } = await getMicroLessons();

  // Filter uncompleted lessons
  const uncompleted = microLessons.filter((l) => !progressMap[l.id]);

  if (uncompleted.length === 0) return null;

  // Deterministic pick per user per day: use day-of-year as index
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));

  const index = dayOfYear % uncompleted.length;
  return uncompleted[index];
}

export async function completeMicroLesson(lessonId: string) {
  // Reuse the existing markLessonComplete logic
  await markLessonComplete(lessonId);
  revalidatePath("/academy/micro");
}

// --- Feature F31: Academy Certificate PDF Generation ---

export async function getUserCertificates() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  // Get user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  // Get all published courses with lessons
  const { data: courses } = await supabase
    .from("courses")
    .select("id, title, modules:course_modules(lessons:lessons(id))")
    .eq("is_published", true)
    .order("position", { ascending: true });

  if (!courses || courses.length === 0) {
    return {
      certificates: [],
      userName: profile?.full_name || user.email || "Apprenant",
    };
  }

  // Get all user's completed lessons
  const { data: progress } = await supabase
    .from("lesson_progress")
    .select("lesson_id, completed, completed_at, quiz_score")
    .eq("user_id", user.id)
    .eq("completed", true);

  const completedSet = new Set((progress || []).map((p) => p.lesson_id));
  const completionMap: Record<
    string,
    { completed_at: string | null; quiz_score: number | null }
  > = {};
  for (const p of progress || []) {
    completionMap[p.lesson_id] = {
      completed_at: p.completed_at,
      quiz_score: p.quiz_score,
    };
  }

  // Build certificates for fully-completed courses
  const certificates: Array<{
    courseId: string;
    courseName: string;
    completionDate: string;
    score: number | null;
    totalLessons: number;
    completedLessons: number;
    certificateId: string;
  }> = [];

  for (const course of courses) {
    const modules = Array.isArray(course.modules) ? course.modules : [];
    const lessonIds: string[] = [];
    for (const mod of modules as Array<{ lessons: Array<{ id: string }> }>) {
      const lessons = Array.isArray(mod.lessons) ? mod.lessons : [];
      for (const lesson of lessons) {
        lessonIds.push(lesson.id);
      }
    }

    if (lessonIds.length === 0) continue;

    const completedLessons = lessonIds.filter((id) => completedSet.has(id));
    if (completedLessons.length < lessonIds.length) continue;

    // Course is fully completed — compute score and completion date
    const scores = lessonIds
      .map((id) => completionMap[id]?.quiz_score)
      .filter((s): s is number => s !== null && s !== undefined);
    const avgScore =
      scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : null;

    const dates = lessonIds
      .map((id) => completionMap[id]?.completed_at)
      .filter((d): d is string => d !== null && d !== undefined)
      .sort();
    const lastDate =
      dates.length > 0 ? dates[dates.length - 1] : new Date().toISOString();

    // Deterministic certificate ID based on user + course
    const certId =
      `${user.id.slice(0, 8)}-${course.id.slice(0, 8)}-CERT`.toUpperCase();

    certificates.push({
      courseId: course.id,
      courseName: course.title,
      completionDate: lastDate,
      score: avgScore,
      totalLessons: lessonIds.length,
      completedLessons: completedLessons.length,
      certificateId: certId,
    });
  }

  return {
    certificates,
    userName: profile?.full_name || user.email || "Apprenant",
  };
}

export async function getCertificateData(courseId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  const { data: course } = await supabase
    .from("courses")
    .select("id, title, modules:course_modules(lessons:lessons(id))")
    .eq("id", courseId)
    .single();

  if (!course) throw new Error("Cours non trouvé");

  const modules = Array.isArray(course.modules) ? course.modules : [];
  const lessonIds: string[] = [];
  for (const mod of modules as Array<{ lessons: Array<{ id: string }> }>) {
    const lessons = Array.isArray(mod.lessons) ? mod.lessons : [];
    for (const lesson of lessons) {
      lessonIds.push(lesson.id);
    }
  }

  if (lessonIds.length === 0) throw new Error("Cours sans leçons");

  const { data: progress } = await supabase
    .from("lesson_progress")
    .select("lesson_id, completed, completed_at, quiz_score")
    .eq("user_id", user.id)
    .eq("completed", true)
    .in("lesson_id", lessonIds);

  const completedCount = (progress || []).length;
  if (completedCount < lessonIds.length) {
    throw new Error("Cours non terminé");
  }

  const scores = (progress || [])
    .map((p) => p.quiz_score)
    .filter((s): s is number => s !== null && s !== undefined);
  const avgScore =
    scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : null;

  const dates = (progress || [])
    .map((p) => p.completed_at)
    .filter((d): d is string => d !== null && d !== undefined)
    .sort();
  const completionDate =
    dates.length > 0 ? dates[dates.length - 1] : new Date().toISOString();

  const certId =
    `${user.id.slice(0, 8)}-${course.id.slice(0, 8)}-CERT`.toUpperCase();

  return {
    courseId: course.id,
    courseName: course.title,
    userName: profile?.full_name || user.email || "Apprenant",
    completionDate,
    score: avgScore,
    certificateId: certId,
  };
}

// --- Feature F32.4: Adaptive Learning System ---

const DIAGNOSTIC_QUESTIONS: Array<{
  id: string;
  category: string;
  categoryLabel: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}> = [
  // Prospection (2)
  {
    id: "p1",
    category: "prospection",
    categoryLabel: "Prospection",
    question:
      "Lors de la qualification d'un lead, quel est le critère le plus important à vérifier en premier ?",
    options: [
      "Son budget disponible",
      "Son besoin réel et sa douleur actuelle",
      "La taille de son entreprise",
      "Son ancienneté dans le secteur",
    ],
    correctIndex: 1,
    explanation:
      "Le besoin réel et la douleur actuelle du prospect sont fondamentaux : sans problème identifié, il n'y a pas de vente possible. Le budget vient après.",
  },
  {
    id: "p2",
    category: "prospection",
    categoryLabel: "Prospection",
    question:
      "Quelle est la meilleure approche pour un premier message de prospection à froid en DM ?",
    options: [
      "Présenter directement votre offre avec un lien de paiement",
      "Envoyer un long message détaillant vos résultats clients",
      "Poser une question ouverte liée à un contenu qu'il a publié récemment",
      "Envoyer un message vocal de 3 minutes expliquant votre parcours",
    ],
    correctIndex: 2,
    explanation:
      "Une question ouverte personnalisée montre que vous vous intéressez au prospect et crée une conversation naturelle, sans pression commerciale immédiate.",
  },
  // Closing (2)
  {
    id: "c1",
    category: "closing",
    categoryLabel: "Closing",
    question:
      "Face à un prospect qui dit « C'est trop cher », quelle est la meilleure réponse ?",
    options: [
      "Proposer immédiatement une réduction de prix",
      "Recontextualiser la valeur en rappelant le coût de l'inaction",
      "Dire que le prix est non négociable et raccrocher",
      "Proposer de rappeler dans 3 mois",
    ],
    correctIndex: 1,
    explanation:
      "Recontextualiser la valeur permet de montrer que le coût de ne rien faire est supérieur à l'investissement demandé. Une remise immédiate décrédibilise l'offre.",
  },
  {
    id: "c2",
    category: "closing",
    categoryLabel: "Closing",
    question:
      "Quelle technique de closing est la plus efficace pour un prospect hésitant mais intéressé ?",
    options: [
      "Le forcer à décider maintenant avec un ultimatum",
      "L'alternative présumée : proposer deux options qui mènent toutes les deux au oui",
      "Lui envoyer 10 témoignages clients par email",
      "Lui accorder un délai de réflexion de 2 semaines",
    ],
    correctIndex: 1,
    explanation:
      "L'alternative présumée guide le prospect vers une décision positive tout en lui laissant le sentiment de contrôle. Les deux options sont des variantes du oui.",
  },
  // Négociation (2)
  {
    id: "n1",
    category: "negociation",
    categoryLabel: "Négociation",
    question: "En négociation, qu'est-ce que la technique d'ancrage ?",
    options: [
      "Commencer par un prix bas pour attirer le prospect",
      "Fixer un point de référence élevé pour que toute concession semble avantageuse",
      "Répéter plusieurs fois le même argument pour convaincre",
      "Proposer un essai gratuit avant de parler du prix",
    ],
    correctIndex: 1,
    explanation:
      "L'ancrage consiste à poser un premier chiffre (souvent élevé) qui sert de référence. Toute offre suivante paraîtra alors plus raisonnable en comparaison.",
  },
  {
    id: "n2",
    category: "negociation",
    categoryLabel: "Négociation",
    question:
      "Lors d'une négociation, quelle est la meilleure façon de faire une concession ?",
    options: [
      "Céder rapidement pour montrer sa bonne volonté",
      "Ne jamais rien céder pour garder le contrôle",
      "Faire une concession conditionnelle : donner quelque chose en échange d'un engagement",
      "Attendre que le prospect parte pour le rappeler avec une remise",
    ],
    correctIndex: 2,
    explanation:
      "La concession conditionnelle (« Si je vous accorde X, est-ce que vous vous engagez sur Y ? ») crée de la valeur des deux côtés et protège vos marges.",
  },
  // Communication (2)
  {
    id: "com1",
    category: "communication",
    categoryLabel: "Communication",
    question: "Qu'est-ce que l'écoute active implique principalement ?",
    options: [
      "Prendre des notes détaillées sans rien dire",
      "Reformuler les propos du prospect et poser des questions de clarification",
      "Attendre que le prospect ait fini pour dérouler son pitch",
      "Hocher la tête en permanence pour montrer son accord",
    ],
    correctIndex: 1,
    explanation:
      "L'écoute active va au-delà d'entendre : elle implique de reformuler pour valider la compréhension et de poser des questions qui approfondissent le sujet.",
  },
  {
    id: "com2",
    category: "communication",
    categoryLabel: "Communication",
    question:
      "Pour créer un rapport de confiance rapidement avec un prospect, il est recommandé de :",
    options: [
      "Parler de soi en premier pour établir sa crédibilité",
      "Utiliser le mirroring (refléter le ton, le rythme et le vocabulaire du prospect)",
      "Envoyer son CV et ses diplômes avant l'appel",
      "Tutoyer le prospect dès le début pour créer de la proximité",
    ],
    correctIndex: 1,
    explanation:
      "Le mirroring est une technique de PNL qui crée inconsciemment un sentiment de familiarité et de confiance. Il ne s'agit pas d'imiter, mais de s'adapter.",
  },
  // Objection handling (2)
  {
    id: "o1",
    category: "objection",
    categoryLabel: "Gestion des objections",
    question:
      "Face à l'objection « Je dois en parler à mon associé », quelle est la meilleure approche ?",
    options: [
      "Dire que ce n'est pas une vraie objection et insister",
      "Valider l'objection, puis proposer d'inclure l'associé dans un prochain appel",
      "Baisser le prix pour que la décision soit plus facile",
      "Envoyer un email récapitulatif et attendre",
    ],
    correctIndex: 1,
    explanation:
      "Valider l'objection montre du respect, et proposer un appel avec l'associé vous garde dans le processus de décision au lieu de le subir passivement.",
  },
  {
    id: "o2",
    category: "objection",
    categoryLabel: "Gestion des objections",
    question:
      "La technique du « Feel, Felt, Found » (Comprendre, Comparer, Constater) sert à :",
    options: [
      "Manipuler le prospect en inventant de faux témoignages",
      "Montrer de l'empathie, normaliser le doute et apporter une preuve sociale",
      "Ignorer l'objection et changer de sujet",
      "Demander au prospect de réfléchir seul et de rappeler",
    ],
    correctIndex: 1,
    explanation:
      "Feel, Felt, Found : « Je comprends votre ressenti (Feel), d'autres clients ont eu la même hésitation (Felt), et voici ce qu'ils ont constaté après avoir avancé (Found) ».",
  },
];

function computeSkillLevel(score: number): string {
  if (score >= 90) return "Expert";
  if (score >= 70) return "Avancé";
  if (score >= 50) return "Intermédiaire";
  return "Débutant";
}

export async function getDiagnosticQuiz() {
  return {
    questions: DIAGNOSTIC_QUESTIONS.map((q) => ({
      id: q.id,
      category: q.category,
      categoryLabel: q.categoryLabel,
      question: q.question,
      options: q.options,
    })),
    totalQuestions: DIAGNOSTIC_QUESTIONS.length,
  };
}

export async function submitDiagnosticResults(
  answers: { questionId: string; answer: string }[],
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  // Score by category
  const categoryScores: Record<
    string,
    { correct: number; total: number; label: string }
  > = {};

  for (const q of DIAGNOSTIC_QUESTIONS) {
    if (!categoryScores[q.category]) {
      categoryScores[q.category] = {
        correct: 0,
        total: 0,
        label: q.categoryLabel,
      };
    }
    categoryScores[q.category].total += 1;

    const userAnswer = answers.find((a) => a.questionId === q.id);
    if (userAnswer) {
      const selectedIndex = q.options.indexOf(userAnswer.answer);
      if (selectedIndex === q.correctIndex) {
        categoryScores[q.category].correct += 1;
      }
    }
  }

  const skills = Object.entries(categoryScores).map(([category, data]) => {
    const score =
      data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0;
    return {
      category,
      categoryLabel: data.label,
      score,
      level: computeSkillLevel(score),
      correct: data.correct,
      total: data.total,
    };
  });

  const overallScore =
    skills.length > 0
      ? Math.round(skills.reduce((sum, s) => sum + s.score, 0) / skills.length)
      : 0;

  // Store results in user metadata (profile)
  const diagnosticData = {
    skills,
    overallScore,
    completedAt: new Date().toISOString(),
    answers: answers.map((a) => {
      const q = DIAGNOSTIC_QUESTIONS.find((dq) => dq.id === a.questionId);
      return {
        questionId: a.questionId,
        answer: a.answer,
        correct: q ? q.options[q.correctIndex] === a.answer : false,
      };
    }),
  };

  // Store in profile metadata
  const { data: profile } = await supabase
    .from("profiles")
    .select("metadata")
    .eq("id", user.id)
    .single();

  const currentMetadata = (profile?.metadata as Record<string, unknown>) || {};

  await supabase
    .from("profiles")
    .update({
      metadata: { ...currentMetadata, diagnostic_result: diagnosticData },
    })
    .eq("id", user.id);

  // Build recommended courses based on weakest skills
  const recommendedCourses = await buildRecommendedCourses(skills);

  revalidatePath("/academy/diagnostic");
  revalidatePath("/academy/path");

  return {
    skills,
    overallScore,
    completedAt: diagnosticData.completedAt,
    recommendedCourses,
  };
}

export async function getSkillAssessment(userId?: string) {
  const supabase = await createClient();

  let targetUserId = userId;
  if (!targetUserId) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Non authentifié");
    targetUserId = user.id;
  }

  // Try skill_assessments table first
  const { data: assessments } = await supabase
    .from("skill_assessments")
    .select("*")
    .eq("user_id", targetUserId)
    .order("assessed_at", { ascending: false })
    .limit(5);

  if (assessments && assessments.length > 0) {
    return {
      source: "skill_assessments" as const,
      skills: assessments.map((a: Record<string, unknown>) => ({
        category: a.skill_name as string,
        categoryLabel: a.skill_name as string,
        score: (a.score as number) || 0,
        level: computeSkillLevel((a.score as number) || 0),
        correct: 0,
        total: 0,
      })),
    };
  }

  // Fallback: check diagnostic results stored in profile metadata
  const { data: profile } = await supabase
    .from("profiles")
    .select("metadata")
    .eq("id", targetUserId)
    .single();

  const metadata = (profile?.metadata || {}) as Record<string, unknown>;
  const diagnosticResult = metadata.diagnostic_result as
    | {
        skills: Array<Record<string, unknown>>;
        overallScore: number;
        completedAt: string;
      }
    | undefined;

  if (diagnosticResult && diagnosticResult.skills) {
    return {
      source: "diagnostic" as const,
      skills: diagnosticResult.skills.map((s) => ({
        category: s.category as string,
        categoryLabel: s.categoryLabel as string,
        score: (s.score as number) || 0,
        level: computeSkillLevel((s.score as number) || 0),
        correct: (s.correct as number) || 0,
        total: (s.total as number) || 0,
      })),
      overallScore: diagnosticResult.overallScore,
      completedAt: diagnosticResult.completedAt,
    };
  }

  return { source: "none" as const, skills: [] };
}

async function buildRecommendedCourses(
  skills: Array<{
    category: string;
    categoryLabel: string;
    score: number;
    level: string;
  }>,
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch all published courses
  const { data: courses } = await supabase
    .from("courses")
    .select(
      "id, title, description, modules:course_modules(lessons:lessons(id, duration_minutes))",
    )
    .eq("is_published", true)
    .order("position", { ascending: true });

  if (!courses || courses.length === 0) return [];

  // Get user progress
  let progressMap: Record<string, boolean> = {};
  if (user) {
    const { data: progress } = await supabase
      .from("lesson_progress")
      .select("lesson_id, completed")
      .eq("user_id", user.id)
      .eq("completed", true);

    if (progress) {
      progressMap = Object.fromEntries(
        progress.map((p: { lesson_id: string }) => [p.lesson_id, true]),
      );
    }
  }

  // Sort skills by score ascending (weakest first)
  const sortedSkills = [...skills].sort((a, b) => a.score - b.score);

  // Map courses to skill categories (simple keyword matching on title/description)
  const skillKeywords: Record<string, string[]> = {
    prospection: [
      "prospect",
      "lead",
      "outreach",
      "acquisition",
      "qualification",
      "dm",
      "message",
    ],
    closing: ["clos", "vente", "conversion", "sign", "deal", "offre"],
    negociation: ["négo", "nego", "prix", "remise", "concession", "ancrage"],
    communication: [
      "communi",
      "écoute",
      "rapport",
      "présent",
      "pitch",
      "relation",
    ],
    objection: ["objection", "refus", "hésit", "doute", "freins", "blocage"],
  };

  const recommended: Array<{
    id: string;
    title: string;
    description: string | null;
    skill: string;
    skillLabel: string;
    priority: string;
    estimatedMinutes: number;
    progress: number;
  }> = [];

  for (const skill of sortedSkills) {
    const keywords = skillKeywords[skill.category] || [];
    const priority =
      skill.score < 50 ? "haute" : skill.score < 75 ? "moyenne" : "basse";

    for (const course of courses) {
      // Already added?
      if (recommended.find((r) => r.id === course.id)) continue;

      const titleLower = (course.title || "").toLowerCase();
      const descLower = (course.description || "").toLowerCase();
      const matches = keywords.some(
        (kw) => titleLower.includes(kw) || descLower.includes(kw),
      );

      if (matches || recommended.length < 3) {
        const modules = Array.isArray(course.modules) ? course.modules : [];
        const allLessons: Array<{
          id: string;
          duration_minutes: number | null;
        }> = [];
        for (const mod of modules as Array<{
          lessons: Array<{ id: string; duration_minutes: number | null }>;
        }>) {
          const lessons = Array.isArray(mod.lessons) ? mod.lessons : [];
          allLessons.push(...lessons);
        }

        const totalMinutes = allLessons.reduce(
          (sum, l) => sum + (l.duration_minutes || 10),
          0,
        );
        const completedCount = allLessons.filter(
          (l) => progressMap[l.id],
        ).length;
        const progressPct =
          allLessons.length > 0
            ? Math.round((completedCount / allLessons.length) * 100)
            : 0;

        recommended.push({
          id: course.id,
          title: course.title,
          description: course.description,
          skill: skill.category,
          skillLabel: skill.categoryLabel,
          priority,
          estimatedMinutes: totalMinutes,
          progress: progressPct,
        });
      }
    }
  }

  return recommended.slice(0, 8);
}

export async function getAdaptivePath(userId?: string) {
  const supabase = await createClient();

  let targetUserId = userId;
  if (!targetUserId) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Non authentifié");
    targetUserId = user.id;
  }

  const assessment = await getSkillAssessment(targetUserId);

  if (assessment.source === "none" || assessment.skills.length === 0) {
    return {
      skills: [],
      courses: [],
      overallScore: 0,
      lastAssessedAt: null,
    };
  }

  const recommendedCourses = await buildRecommendedCourses(
    assessment.skills.map((s) => ({
      category: s.category,
      categoryLabel: s.categoryLabel,
      score: s.score,
      level: s.level,
    })),
  );

  const overallScore =
    assessment.skills.length > 0
      ? Math.round(
          assessment.skills.reduce((sum, s) => sum + s.score, 0) /
            assessment.skills.length,
        )
      : 0;

  return {
    skills: assessment.skills,
    courses: recommendedCourses,
    overallScore,
    lastAssessedAt:
      "completedAt" in assessment
        ? (assessment as { completedAt: string }).completedAt
        : null,
  };
}

// --- Feature #30: Notifications de mise a jour contenu ---

export async function notifyContentUpdate(
  courseId: string,
  changeDescription: string,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifie");

  // Verify admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "manager"].includes(profile.role)) {
    throw new Error("Acces refuse");
  }

  const { data: course } = await supabase
    .from("courses")
    .select("title")
    .eq("id", courseId)
    .single();

  if (!course) throw new Error("Cours non trouve");

  // Get all users who have progress on this course
  const { data: lessons } = await supabase
    .from("lessons")
    .select("id")
    .eq("course_id", courseId);

  const lessonIds = (lessons || []).map((l) => l.id);

  let userIds: string[] = [];
  if (lessonIds.length > 0) {
    const { data: progressEntries } = await supabase
      .from("lesson_progress")
      .select("user_id")
      .in("lesson_id", lessonIds);

    userIds = [...new Set((progressEntries || []).map((p) => p.user_id))];
  }

  // If no specific users, notify all clients
  if (userIds.length === 0) {
    const { data: clients } = await supabase
      .from("profiles")
      .select("id")
      .in("role", ["client_b2b", "client_b2c"]);

    userIds = (clients || []).map((c) => c.id);
  }

  if (userIds.length > 0) {
    await notifyMany(
      userIds,
      `Mise a jour : ${course.title}`,
      changeDescription,
      { type: "content_update", link: `/academy/${courseId}` },
    );
  }

  revalidatePath("/academy");
  return { notified: userIds.length };
}

// ---------- Recommandations Personnalisées (F74) ----------

export async function getPersonalizedRecommendations() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { recommendations: [] };

  // Get user's quiz scores grouped by lesson
  const { data: progress } = await supabase
    .from("lesson_progress")
    .select(
      "lesson_id, completed, quiz_score, lessons(title, course_id, courses(title))",
    )
    .eq("user_id", user.id);

  // Get all courses with lessons
  const { data: courses } = await supabase
    .from("courses")
    .select("id, title, description, modules(id, title, lessons(id, title))")
    .eq("is_published", true);

  // Identify weak areas (low quiz scores)
  const weakLessons = (progress || [])
    .filter((p) => p.quiz_score !== null && p.quiz_score < 70)
    .map((p) => ({
      lessonId: p.lesson_id,
      score: p.quiz_score,
      title: (p as Record<string, unknown>).lessons
        ? ((p as Record<string, unknown>).lessons as { title?: string })
            .title || "Leçon"
        : "Leçon",
      courseTitle: "Cours",
      reason: `Score de ${p.quiz_score}% — révision recommandée`,
    }));

  // Identify not-started courses
  const completedLessonIds = new Set(
    (progress || []).filter((p) => p.completed).map((p) => p.lesson_id),
  );
  const notStarted = (courses || [])
    .filter((c) => {
      const lessons =
        c.modules?.flatMap(
          (m: { lessons?: { id: string }[] }) => m.lessons || [],
        ) || [];
      return (
        lessons.length > 0 &&
        !lessons.some((l: { id: string }) => completedLessonIds.has(l.id))
      );
    })
    .map((c) => ({
      courseId: c.id,
      title: c.title,
      description: c.description,
      reason: "Pas encore commencé",
    }));

  // Identify partially completed courses (stalled)
  const partiallyCompleted = (courses || [])
    .filter((c) => {
      const lessons =
        c.modules?.flatMap(
          (m: { lessons?: { id: string }[] }) => m.lessons || [],
        ) || [];
      const completed = lessons.filter((l: { id: string }) =>
        completedLessonIds.has(l.id),
      ).length;
      return completed > 0 && completed < lessons.length;
    })
    .map((c) => {
      const lessons =
        c.modules?.flatMap(
          (m: { lessons?: { id: string }[] }) => m.lessons || [],
        ) || [];
      const completed = lessons.filter((l: { id: string }) =>
        completedLessonIds.has(l.id),
      ).length;
      const pct = Math.round((completed / lessons.length) * 100);
      return {
        courseId: c.id,
        title: c.title,
        progress: pct,
        reason: `${pct}% terminé — continue ta progression !`,
      };
    });

  return {
    recommendations: {
      toReview: weakLessons.slice(0, 5),
      toContinue: partiallyCompleted.slice(0, 3),
      toDiscover: notStarted.slice(0, 3),
    },
  };
}

// ---------------------------------------------------------------------------
// Exercices Pratiques avec Correction IA
// ---------------------------------------------------------------------------

export async function getExercisePrompts(courseId?: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  let query = supabase
    .from("lessons")
    .select("id, title, course_id, description, courses(title)")
    .not("description", "is", null)
    .order("position");

  if (courseId) {
    query = query.eq("course_id", courseId);
  }

  const { data } = await query.limit(20);

  return (data || []).map(
    (l: {
      id: string;
      title: string;
      course_id: string;
      description: string | null;
      courses: { title: string } | { title: string }[] | null;
    }) => ({
      id: l.id,
      lessonTitle: l.title,
      courseTitle: Array.isArray(l.courses)
        ? l.courses[0]?.title || ""
        : l.courses?.title || "",
      prompt: `Exercice basé sur "${l.title}": Rédigez un premier message de prospection pour un prospect dans le contexte de cette leçon. Expliquez votre approche.`,
    }),
  );
}

export type ExerciseResult = {
  score: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
  correctedVersion: string;
};

export async function submitExercise(
  lessonId: string,
  submission: string,
): Promise<ExerciseResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  if (!submission || submission.trim().length < 20) {
    throw new Error("Votre réponse doit contenir au moins 20 caractères.");
  }

  const { data: lesson } = await supabase
    .from("lessons")
    .select("title, description, courses(title)")
    .eq("id", lessonId)
    .single();

  const courseTitle = lesson?.courses
    ? Array.isArray(lesson.courses)
      ? (lesson.courses[0] as { title: string })?.title
      : (lesson.courses as { title: string }).title
    : "Formation";

  try {
    const result = await aiJSON<ExerciseResult>(
      `Tu es un coach expert en vente et setting. Analyse cet exercice d'un setter en formation.

Module: ${courseTitle}
Leçon: ${lesson?.title || "Exercice"}

Soumission du setter:
"""
${submission}
"""

Évalue sur ces critères:
1. Pertinence par rapport au module (0-25)
2. Qualité rédactionnelle (0-25)
3. Personnalisation du message (0-25)
4. Technique de vente utilisée (0-25)

Réponds en JSON:
{
  "score": number (0-100),
  "feedback": "feedback global constructif en 2-3 phrases",
  "strengths": ["point fort 1", "point fort 2"],
  "improvements": ["amélioration 1", "amélioration 2"],
  "correctedVersion": "version améliorée du message"
}`,
      {
        system:
          "Tu es un coach expert en vente/setting chez S Academy. Réponds uniquement en français.",
      },
    );
    return result;
  } catch {
    return {
      score: 0,
      feedback:
        "Correction IA indisponible — réessayez dans quelques instants.",
      strengths: [],
      improvements: [],
      correctedVersion: "",
    };
  }
}

// ─── Course completion notification ──────────────────────────

/**
 * Notify admins when a user completes an entire course.
 */
export async function notifyCourseCompletion(courseId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  const { data: course } = await supabase
    .from("courses")
    .select("title")
    .eq("id", courseId)
    .single();

  const userName = profile?.full_name || "Un utilisateur";
  const courseTitle = course?.title || "un cours";

  // Notify all admins
  const { data: admins } = await supabase
    .from("profiles")
    .select("id")
    .in("role", ["admin", "manager"]);

  for (const admin of (admins || []).slice(0, 20)) {
    await notifyMany(
      [admin.id],
      "Formation terminee",
      `${userName} a termine le cours "${courseTitle}"`,
      { link: "/academy/admin/progress", type: "achievement" },
    );
  }
}

// ─── Academy Leaderboard ─────────────────────────────────────

/**
 * Top 7 setters by quiz success rate (passed attempts / total attempts).
 * Only considers users with role setter or closer who have at least 1 attempt.
 */
export async function getAcademyLeaderboard(): Promise<
  Array<{
    userId: string;
    fullName: string;
    avatarUrl: string | null;
    role: string;
    totalAttempts: number;
    passedAttempts: number;
    successRate: number;
    avgScore: number;
  }>
> {
  const supabase = await createClient();

  // Fetch all quiz attempts with user profiles
  const { data: attempts } = await supabase
    .from("quiz_attempts")
    .select("user_id, score, passed, profiles!user_id(full_name, avatar_url, role)")
    .order("attempted_at", { ascending: false });

  if (!attempts || attempts.length === 0) return [];

  // Group by user
  const byUser: Record<
    string,
    {
      fullName: string;
      avatarUrl: string | null;
      role: string;
      scores: number[];
      passedCount: number;
    }
  > = {};

  for (const a of attempts) {
    const profile = Array.isArray(a.profiles) ? a.profiles[0] : a.profiles;
    if (!profile) continue;
    const p = profile as unknown as {
      full_name: string | null;
      avatar_url: string | null;
      role: string;
    };
    // Only setters and closers
    if (!["setter", "closer"].includes(p.role)) continue;

    if (!byUser[a.user_id]) {
      byUser[a.user_id] = {
        fullName: p.full_name || "Utilisateur",
        avatarUrl: p.avatar_url,
        role: p.role,
        scores: [],
        passedCount: 0,
      };
    }
    byUser[a.user_id].scores.push(a.score);
    if (a.passed) byUser[a.user_id].passedCount++;
  }

  // Compute and sort
  const leaderboard = Object.entries(byUser)
    .map(([userId, data]) => ({
      userId,
      fullName: data.fullName,
      avatarUrl: data.avatarUrl,
      role: data.role,
      totalAttempts: data.scores.length,
      passedAttempts: data.passedCount,
      successRate:
        data.scores.length > 0
          ? Math.round((data.passedCount / data.scores.length) * 100)
          : 0,
      avgScore:
        data.scores.length > 0
          ? Math.round(
              data.scores.reduce((s, v) => s + v, 0) / data.scores.length,
            )
          : 0,
    }))
    .sort((a, b) => b.successRate - a.successRate || b.avgScore - a.avgScore)
    .slice(0, 7);

  return leaderboard;
}
