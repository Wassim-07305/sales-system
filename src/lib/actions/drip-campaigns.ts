"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// We store drip campaigns as automation_rules with type = "drip_campaign"
// The "actions" JSONB column holds the campaign steps array
// The "trigger_conditions" JSONB column holds metadata: { list_id, description }

export interface DripCampaignStep {
  id: string;
  order: number;
  delay_days: number;
  template_id: string | null;
  template_name?: string;
  action_type: "send_dm" | "follow_up" | "like_post" | "comment" | "connection_request";
  custom_message?: string;
}

export interface DripCampaign {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  created_by: string;
  list_id: string | null;
  list_name?: string;
  description?: string;
  steps: DripCampaignStep[];
  prospect_count?: number;
  executions_count?: number;
  completed_count?: number;
}

export async function getDripCampaigns(): Promise<DripCampaign[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifie");

  const { data, error } = await supabase
    .from("automation_rules")
    .select("*")
    .eq("type", "drip_campaign")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  if (!data || data.length === 0) return [];

  // Gather list IDs to fetch prospect counts
  const listIds = data
    .map((r) => (r.trigger_conditions as Record<string, unknown>)?.list_id as string)
    .filter(Boolean);

  // Fetch prospect counts per list
  const listCounts: Record<string, number> = {};
  const listNames: Record<string, string> = {};
  if (listIds.length > 0) {
    const { data: lists } = await supabase
      .from("prospect_lists")
      .select("id, name")
      .in("id", listIds);

    for (const list of lists || []) {
      listNames[list.id] = list.name;
    }

    const { data: prospects } = await supabase
      .from("prospects")
      .select("list_id")
      .in("list_id", listIds);

    for (const p of prospects || []) {
      const lid = p.list_id as string;
      listCounts[lid] = (listCounts[lid] || 0) + 1;
    }
  }

  // Fetch execution stats per campaign
  const ruleIds = data.map((r) => r.id);
  const { data: executions } = await supabase
    .from("automation_executions")
    .select("rule_id, status")
    .in("rule_id", ruleIds);

  const execStats: Record<string, { total: number; completed: number }> = {};
  for (const ex of executions || []) {
    const rid = ex.rule_id as string;
    if (!execStats[rid]) execStats[rid] = { total: 0, completed: 0 };
    execStats[rid].total++;
    if (ex.status === "completed") execStats[rid].completed++;
  }

  return data.map((rule) => {
    const meta = (rule.trigger_conditions || {}) as Record<string, unknown>;
    const steps = ((rule.actions || []) as DripCampaignStep[]).sort(
      (a, b) => a.order - b.order
    );
    const listId = meta.list_id as string | null;

    return {
      id: rule.id,
      name: rule.name || "Sans nom",
      is_active: rule.is_active ?? false,
      created_at: rule.created_at,
      created_by: rule.created_by,
      list_id: listId,
      list_name: listId ? listNames[listId] || null : null,
      description: (meta.description as string) || undefined,
      steps,
      prospect_count: listId ? listCounts[listId] || 0 : 0,
      executions_count: execStats[rule.id]?.total || 0,
      completed_count: execStats[rule.id]?.completed || 0,
    } as DripCampaign;
  });
}

export async function createDripCampaign(campaignData: {
  name: string;
  list_id: string;
  description?: string;
  steps: Omit<DripCampaignStep, "id">[];
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifie");

  // Generate IDs for each step
  const steps: DripCampaignStep[] = campaignData.steps.map((step, idx) => ({
    ...step,
    id: crypto.randomUUID(),
    order: idx + 1,
  }));

  const { data, error } = await supabase
    .from("automation_rules")
    .insert({
      name: campaignData.name,
      type: "drip_campaign",
      trigger_conditions: {
        list_id: campaignData.list_id,
        description: campaignData.description || "",
      },
      actions: steps,
      is_active: false,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/prospecting/campaigns");
  return data;
}

export async function getDripCampaignDetail(id: string): Promise<DripCampaign | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifie");

  const { data: rule, error } = await supabase
    .from("automation_rules")
    .select("*")
    .eq("id", id)
    .eq("type", "drip_campaign")
    .single();

  if (error || !rule) return null;

  const meta = (rule.trigger_conditions || {}) as Record<string, unknown>;
  const listId = meta.list_id as string | null;

  // Fetch list info
  let listName: string | undefined;
  let prospectCount = 0;
  if (listId) {
    const { data: list } = await supabase
      .from("prospect_lists")
      .select("id, name")
      .eq("id", listId)
      .single();
    listName = list?.name || undefined;

    const { data: prospects } = await supabase
      .from("prospects")
      .select("id")
      .eq("list_id", listId);
    prospectCount = prospects?.length || 0;
  }

  // Fetch executions
  const { data: executions } = await supabase
    .from("automation_executions")
    .select("*")
    .eq("rule_id", id)
    .order("created_at", { ascending: false });

  const totalExec = executions?.length || 0;
  const completedExec = executions?.filter((e) => e.status === "completed").length || 0;

  // Build step execution stats
  const stepStats: Record<string, { sent: number; completed: number }> = {};
  for (const ex of executions || []) {
    const result = (ex.result || {}) as Record<string, unknown>;
    const stepId = result.step_id as string;
    if (stepId) {
      if (!stepStats[stepId]) stepStats[stepId] = { sent: 0, completed: 0 };
      stepStats[stepId].sent++;
      if (ex.status === "completed") stepStats[stepId].completed++;
    }
  }

  const steps = ((rule.actions || []) as (DripCampaignStep & { sent?: number; step_completed?: number })[])
    .sort((a, b) => a.order - b.order)
    .map((step) => ({
      ...step,
      sent: stepStats[step.id]?.sent || 0,
      step_completed: stepStats[step.id]?.completed || 0,
    }));

  // Fetch template names for each step
  const templateIds = steps
    .map((s) => s.template_id)
    .filter(Boolean) as string[];

  if (templateIds.length > 0) {
    const { data: templates } = await supabase
      .from("dm_templates")
      .select("id, name")
      .in("id", templateIds);

    const templateMap: Record<string, string> = {};
    for (const t of templates || []) {
      templateMap[t.id] = t.name;
    }

    for (const step of steps) {
      if (step.template_id && templateMap[step.template_id]) {
        step.template_name = templateMap[step.template_id];
      }
    }
  }

  return {
    id: rule.id,
    name: rule.name || "Sans nom",
    is_active: rule.is_active ?? false,
    created_at: rule.created_at,
    created_by: rule.created_by,
    list_id: listId,
    list_name: listName,
    description: (meta.description as string) || undefined,
    steps,
    prospect_count: prospectCount,
    executions_count: totalExec,
    completed_count: completedExec,
  };
}

export async function toggleDripCampaign(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifie");

  // Get current state
  const { data: rule } = await supabase
    .from("automation_rules")
    .select("is_active")
    .eq("id", id)
    .single();

  if (!rule) throw new Error("Campagne introuvable");

  const { error } = await supabase
    .from("automation_rules")
    .update({ is_active: !rule.is_active })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/prospecting/campaigns");
}

export async function deleteDripCampaign(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifie");

  // Delete executions first
  await supabase
    .from("automation_executions")
    .delete()
    .eq("rule_id", id);

  const { error } = await supabase
    .from("automation_rules")
    .delete()
    .eq("id", id)
    .eq("type", "drip_campaign");

  if (error) throw new Error(error.message);
  revalidatePath("/prospecting/campaigns");
}
