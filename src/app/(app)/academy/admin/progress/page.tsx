import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getSetterProgressTable } from "@/lib/actions/academy-admin";
import { ProgressView } from "./progress-view";

export default async function AcademyProgressPage() {
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
    redirect("/dashboard");
  }

  const progress = await getSetterProgressTable();

  return <ProgressView progress={progress} />;
}
