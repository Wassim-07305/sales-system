import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getAutomationRules, getAutomationExecutions } from "@/lib/actions/automation";
import { PlacementView } from "./placement-view";

export default async function PlacementPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const rules = await getAutomationRules("placement");
  const executions = await getAutomationExecutions();

  // Filter executions to placement rules only
  const ruleIds = new Set(rules.map((r: any) => r.id));
  const placementExecutions = (executions as any[]).filter(
    (e) => ruleIds.has(e.rule_id)
  );

  return (
    <PlacementView
      rules={rules as any}
      executions={placementExecutions as any}
    />
  );
}
