import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getAutomationRules, getAutomationExecutions } from "@/lib/actions/automation";
import { UpsellView } from "./upsell-view";

export default async function UpsellPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const rules = await getAutomationRules("upsell");
  const executions = await getAutomationExecutions();

  // Filter executions to upsell rules only
  const ruleIds = new Set(rules.map((r: any) => r.id));
  const upsellExecutions = (executions as any[]).filter(
    (e) => ruleIds.has(e.rule_id)
  );

  return (
    <UpsellView
      rules={rules as any}
      executions={upsellExecutions as any}
    />
  );
}
