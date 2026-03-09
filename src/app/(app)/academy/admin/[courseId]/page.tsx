import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { CourseEditor } from "./course-editor";
import type { Course, CourseModule, Lesson } from "@/lib/types/database";

export default async function CourseEditorPage({
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "manager"].includes(profile.role)) {
    redirect("/academy");
  }

  const { data: course } = await supabase
    .from("courses")
    .select("*, modules:course_modules(*, lessons:lessons(*))")
    .eq("id", courseId)
    .single();

  if (!course) notFound();

  // Trier les modules et lecons par position
  const sortedCourse: Course & { modules: (CourseModule & { lessons: Lesson[] })[] } = {
    ...course,
    modules: Array.isArray(course.modules)
      ? (course.modules as (CourseModule & { lessons: Lesson[] })[])
          .sort((a, b) => a.position - b.position)
          .map((m) => ({
            ...m,
            lessons: Array.isArray(m.lessons)
              ? m.lessons.sort((a, b) => a.position - b.position)
              : [],
          }))
      : [],
  };

  return <CourseEditor course={sortedCourse} />;
}
