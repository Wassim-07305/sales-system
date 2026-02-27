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

  // Fetch quiz attempts for each lesson that has a quiz
  const quizAttempts: Record<
    string,
    { todayAttempts: number; bestScore: number; maxAttempts: number }
  > = {};

  const today = new Date().toISOString().split("T")[0];

  for (const [lessonId, quiz] of Object.entries(result.quizMap)) {
    const { data: attempts } = await supabase
      .from("quiz_attempts")
      .select("*")
      .eq("user_id", user.id)
      .eq("lesson_id", lessonId)
      .order("attempted_at", { ascending: false });

    const todayAttempts = (attempts || []).filter(
      (a: { attempted_at: string }) =>
        a.attempted_at >= `${today}T00:00:00.000Z`
    );

    quizAttempts[lessonId] = {
      todayAttempts: todayAttempts.length,
      bestScore: Math.max(0, ...(attempts || []).map((a: { score: number }) => a.score)),
      maxAttempts:
        (quiz as { max_attempts_per_day?: number }).max_attempts_per_day || 3,
    };
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
      duration_minutes: number | null;
      attachments: Array<{ name: string; url: string; type: string }>;
      content_html: string | null;
      position: number;
    }>;
  }>;
};
