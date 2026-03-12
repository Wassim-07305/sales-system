import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { getCourseDetail } from "@/lib/actions/academy";
import { CourseView } from "./course-view";

export default async function CoursePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const result = await getCourseDetail(courseId);
  if (!result) notFound();

  // Fetch ALL quiz attempts in a single query instead of N+1
  const lessonIdsWithQuiz = Object.keys(result.quizMap);
  const today = new Date().toISOString().split("T")[0];

  const quizAttempts: Record<
    string,
    { todayAttempts: number; bestScore: number; maxAttempts: number }
  > = {};

  if (lessonIdsWithQuiz.length > 0) {
    const { data: allAttempts } = await supabase
      .from("quiz_attempts")
      .select("lesson_id, score, attempted_at")
      .eq("user_id", user.id)
      .in("lesson_id", lessonIdsWithQuiz)
      .order("attempted_at", { ascending: false });

    for (const lessonId of lessonIdsWithQuiz) {
      const attempts = (allAttempts || []).filter(
        (a) => a.lesson_id === lessonId
      );
      const todayAttempts = attempts.filter(
        (a) => a.attempted_at >= `${today}T00:00:00.000Z`
      );
      const quiz = result.quizMap[lessonId] as { max_attempts_per_day?: number };

      quizAttempts[lessonId] = {
        todayAttempts: todayAttempts.length,
        bestScore: Math.max(0, ...attempts.map((a) => a.score)),
        maxAttempts: quiz.max_attempts_per_day || 3,
      };
    }
  }

  return (
    <CourseView
      course={result.course as CourseViewCourse}
      progressMap={result.progressMap}
      quizMap={result.quizMap}
      prerequisites={result.prerequisites}
      allPrereqsMet={result.allPrereqsMet}
      userId={user.id}
      quizAttempts={quizAttempts}
    />
  );
}

// Type helper for the course shape returned by getCourseDetail
type CourseViewCourse = {
  id: string;
  title: string;
  description: string | null;
  modules: Array<{
    id: string;
    title: string;
    description: string | null;
    position: number;
    lessons: Array<{
      id: string;
      title: string;
      description: string | null;
      video_url: string | null;
      subtitle_url: string | null;
      duration_minutes: number | null;
      attachments: Array<{ name: string; url: string; type: string }>;
      content_html: string | null;
      position: number;
    }>;
  }>;
};
