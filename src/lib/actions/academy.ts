"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getCourseWithPrerequisites(courseId: string, userId: string) {
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
    .select("prerequisite_course_id, courses!course_prerequisites_prerequisite_course_id_fkey(title)")
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
          completed: true,
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
    })
  );

  const allPrereqsMet = prereqStatus.every((p) => p.completed);

  return { course, prerequisites: prereqStatus, allPrereqsMet };
}

export async function submitQuizAttempt(
  quizId: string,
  lessonId: string,
  answers: Record<number, number>,
  score: number,
  passed: boolean
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifie");

  // Check attempts today
  const today = new Date().toISOString().split("T")[0];
  const { data: todayAttempts } = await supabase
    .from("quiz_attempts")
    .select("id")
    .eq("user_id", user.id)
    .eq("lesson_id", lessonId)
    .gte("attempted_at", `${today}T00:00:00.000Z`);

  const { data: quiz } = await supabase
    .from("quizzes")
    .select("max_attempts_per_day")
    .eq("id", quizId)
    .single();

  const maxAttempts = quiz?.max_attempts_per_day || 3;

  if ((todayAttempts || []).length >= maxAttempts) {
    throw new Error(`Maximum ${maxAttempts} tentatives par jour atteint`);
  }

  await supabase.from("quiz_attempts").insert({
    user_id: user.id,
    lesson_id: lessonId,
    answers,
    score,
    passed,
  });

  revalidatePath("/academy");
  return { attemptsLeft: maxAttempts - (todayAttempts || []).length - 1 };
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
    (a) => a.attempted_at >= `${today}T00:00:00.000Z`
  );

  return {
    allAttempts: attempts || [],
    todayAttempts: todayAttempts.length,
    bestScore: Math.max(0, ...(attempts || []).map((a) => a.score)),
  };
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
        lessons.map((l) => l.id)
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
  userAnswer: string
) {
  // Stub — will use OpenAI later
  return {
    score: Math.floor(Math.random() * 30) + 70,
    feedback:
      "Bonne reponse dans l'ensemble. Points d'amelioration : structure plus claire, ajout d'exemples concrets.",
    suggestions: [
      "Utilisez des exemples tires de votre experience",
      "Structurez votre reponse en 3 parties",
      "Ajoutez une conclusion avec un call-to-action",
    ],
  };
}
