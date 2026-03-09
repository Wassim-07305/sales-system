import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { generateSetterReport } from "@/lib/actions/analytics-v2";
import { ReportsView } from "./reports-view";

export default async function SetterReportsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "manager"].includes(profile.role)) {
    redirect("/dashboard");
  }

  // Get all setters for the selector
  const { data: setters } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("role", "setter")
    .order("full_name");

  const reportData = await generateSetterReport();

  return (
    <ReportsView
      data={reportData as any}
      setters={(setters || []).map((s) => ({ id: s.id, name: s.full_name || "Setter" }))}
    />
  );
}
