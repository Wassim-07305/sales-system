import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getAutomationRules, getAutomationExecutions } from "@/lib/actions/automation";
import { NurturingView } from "./nurturing-view";

export default async function NurturingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const rules = await getAutomationRules("nurturing");
  const executions = await getAutomationExecutions();

  // Filter executions to nurturing rules only
  const ruleIds = new Set(rules.map((r: any) => r.id));
  const nurturingExecutions = (executions as any[]).filter(
    (e) => ruleIds.has(e.rule_id)
  );

  return (
    <NurturingView
      rules={rules as any}
      executions={nurturingExecutions as any}
    />
  );
}
