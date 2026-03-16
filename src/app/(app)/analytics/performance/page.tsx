import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getPersonalPerformanceReport } from "@/lib/actions/dashboard";
import { PerformanceView } from "./performance-view";

export default async function PerformancePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  // Allow setters, closers, managers, and admins
  if (
    !profile ||
    !["setter", "closer", "manager", "admin"].includes(profile.role)
  ) {
    redirect("/dashboard");
  }

  const report = await getPersonalPerformanceReport(user.id);

  return (
    <PerformanceView
      report={report}
      userName={profile.full_name || "Utilisateur"}
      userRole={profile.role}
    />
  );
}
