import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getAdminCourses } from "@/lib/actions/academy-admin";
import { CourseList } from "./course-list";

export default async function AcademyAdminPage() {
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

  const courses = await getAdminCourses();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <CourseList initialCourses={courses as any} />;
}
