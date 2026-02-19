import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { CourseView } from "./course-view";

interface Props {
  params: Promise<{ courseId: string }>;
}

export default async function CoursePage({ params }: Props) {
  const { courseId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: course } = await supabase
    .from("courses")
    .select("*")
    .eq("id", courseId)
    .single();

  if (!course) notFound();

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

  return (
    <CourseView
      course={course}
      lessons={lessons || []}
      progress={progress || []}
      quizzes={quizzes || []}
      userId={user?.id || ""}
    />
  );
}
