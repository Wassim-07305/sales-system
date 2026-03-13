import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getAutomationRules, getAutomationExecutions, getAutomationLogs } from "@/lib/actions/automation";
import { AutomationView } from "./automation-view";

export default async function AutomationPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [rules, executions, todayLogs] = await Promise.all([
    getAutomationRules(),
    getAutomationExecutions(),
    getAutomationLogs({ todayOnly: true }),
  ]);

  return (
    <AutomationView
      rules={rules as React.ComponentProps<typeof AutomationView>["rules"]}
      executions={executions as React.ComponentProps<typeof AutomationView>["executions"]}
      todayExecutions={todayLogs as React.ComponentProps<typeof AutomationView>["todayExecutions"]}
    />
  );
}
