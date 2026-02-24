import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { CourseView } from "./course-view";
import {
  getCourseWithPrerequisites,
  getQuizAttempts,
} from "@/lib/actions/academy";

interface Props {
  params: Promise<{ courseId: string }>;
}

export default async function CoursePage({ params }: Props) {
  const { courseId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Get course with prerequisites
  const courseData = await getCourseWithPrerequisites(
    courseId,
    user?.id || ""
  );
  if (!courseData) notFound();

  const { course, prerequisites, allPrereqsMet } = courseData;

  const { data: lessons } = await supabase
    .from("lessons")
    .select("*")
    .eq("course_id", courseId)
    .order("position");

  const { data: progress } = await supabase
    .from("lesson_progress")
    .select("*")
    .eq("user_id", user?.id || "")
    .in(
      "lesson_id",
      (lessons || []).map((l) => l.id)
    );

  const { data: quizzes } = await supabase
    .from("quizzes")
    .select("*")
    .in(
      "lesson_id",
      (lessons || []).map((l) => l.id)
    );

  // Fetch quiz attempts for each lesson that has a quiz
  const quizAttempts: Record<
    string,
    { todayAttempts: number; bestScore: number; maxAttempts: number }
  > = {};

  if (user) {
    for (const quiz of quizzes || []) {
      const attempts = await getQuizAttempts(quiz.lesson_id, user.id);
      quizAttempts[quiz.lesson_id] = {
        todayAttempts: attempts.todayAttempts,
        bestScore: attempts.bestScore,
        maxAttempts: quiz.max_attempts_per_day || 3,
      };
    }
  }

  return (
    <CourseView
      course={course}
      lessons={lessons || []}
      progress={progress || []}
      quizzes={quizzes || []}
      userId={user?.id || ""}
      prerequisites={prerequisites}
      allPrereqsMet={allPrereqsMet}
      quizAttempts={quizAttempts}
    />
  );
}
