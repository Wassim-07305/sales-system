import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getCoursesWithModules } from "@/lib/actions/academy";
import { CourseGrid } from "./course-grid";

export default async function AcademyPage() {
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

  const { courses, progressMap } = await getCoursesWithModules();
  const isAdmin = profile?.role === "admin" || profile?.role === "manager";

  return (
    <CourseGrid
      courses={courses as CourseGridCourse[]}
      progressMap={progressMap}
      isAdmin={isAdmin}
    />
  );
}

// Type re-exported for clarity — matches getCoursesWithModules() return shape
type CourseGridCourse = {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  position: number;
  modules: Array<{
    id: string;
    title: string;
    lessons: Array<{
      id: string;
      title: string;
      duration_minutes: number | null;
    }>;
  }>;
};
