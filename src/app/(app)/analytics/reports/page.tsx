import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getSavedReports } from "@/lib/actions/reports";
import { ReportsView } from "./reports-view";

export default async function ReportsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: savedReports, useLocalStorage } = await getSavedReports();
  return <ReportsView initialSavedReports={savedReports} useLocalStorage={useLocalStorage || false} />;
}
