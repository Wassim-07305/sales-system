import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getReports } from "@/lib/actions/white-label";
import { PortalReportsView } from "./portal-reports-view";

export default async function PortalReportsPage() {
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

  if (profile?.role !== "client_b2b") redirect("/dashboard");

  const reports = await getReports();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <PortalReportsView reports={reports as any} />;
}
