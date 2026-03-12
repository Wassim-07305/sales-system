import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getAutomationRules, getAutomationExecutions } from "@/lib/actions/automation";
import { AutomationView } from "./automation-view";

export default async function AutomationPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const rules = await getAutomationRules();
  const executions = await getAutomationExecutions();

  return (
    <AutomationView
      rules={rules as React.ComponentProps<typeof AutomationView>["rules"]}
      executions={executions as React.ComponentProps<typeof AutomationView>["executions"]}
    />
  );
}
