import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { generateValueReport } from "@/lib/actions/analytics-v2";
import { ValueReportsView } from "./value-reports-view";

export default async function ValueReportsPage() {
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

  const report = await generateValueReport();

  return <ValueReportsView data={report} />;
}
