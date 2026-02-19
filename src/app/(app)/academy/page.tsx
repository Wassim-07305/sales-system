import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { CourseGrid } from "./course-grid";

export default async function AcademyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: courses } = await supabase
    .from("courses")
    .select("*, lessons(*)")
    .eq("is_published", true)
    .order("position");

  const { data: progress } = await supabase
    .from("lesson_progress")
    .select("*")
    .eq("user_id", user?.id || "");

  return (
    <div>
      <PageHeader
        title="Academy"
        description="Formez-vous et développez vos compétences sales"
      />
      <CourseGrid
        courses={courses || []}
        progress={progress || []}
      />
    </div>
  );
}
