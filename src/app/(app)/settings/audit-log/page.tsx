import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getAuditLogs } from "@/lib/actions/audit-log";
import { AuditLogView } from "./audit-log-view";

export default async function AuditLogPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    redirect("/dashboard");
  }

  const logs = await getAuditLogs();
  return <AuditLogView logs={logs} />;
}
