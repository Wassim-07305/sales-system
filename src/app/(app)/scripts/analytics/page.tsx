import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getScriptAnalytics } from "@/lib/actions/scripts-v2";
import { ScriptAnalyticsView } from "./analytics-view";

export default async function ScriptAnalyticsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const analytics = await getScriptAnalytics();

  return <ScriptAnalyticsView data={analytics} />;
}
