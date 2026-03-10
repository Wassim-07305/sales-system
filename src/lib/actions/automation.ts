"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getAutomationRules(type?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  let query = supabase
    .from("automation_rules")
    .select("*")
    .order("created_at", { ascending: false });

  if (type) {
    query = query.eq("type", type);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data || [];
}

export async function createAutomationRule(ruleData: {
  name: string;
  type: "nurturing" | "upsell" | "placement";
  trigger_conditions: Record<string, unknown>;
  actions: unknown[];
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const { data, error } = await supabase
    .from("automation_rules")
    .insert({
      name: ruleData.name,
      type: ruleData.type,
      trigger_conditions: ruleData.trigger_conditions,
      actions: ruleData.actions,
      is_active: true,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/automation");
  return data;
}

export async function updateAutomationRule(
  id: string,
  ruleData: Partial<{
    name: string;
    trigger_conditions: Record<string, unknown>;
    actions: unknown[];
  }>
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const { error } = await supabase
    .from("automation_rules")
    .update(ruleData)
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/automation");
}

export async function deleteAutomationRule(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const { error } = await supabase
    .from("automation_rules")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/automation");
}

export async function toggleAutomationRule(id: string, isActive: boolean) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const { error } = await supabase
    .from("automation_rules")
    .update({ is_active: isActive })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/automation");
}

export async function getAutomationExecutions(ruleId?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  let query = supabase
    .from("automation_executions")
    .select("*, rule:automation_rules(id, name, type), target_user:profiles(id, full_name)")
    .order("created_at", { ascending: false })
    .limit(50);

  if (ruleId) {
    query = query.eq("rule_id", ruleId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data || [];
}

export async function runPlacementWorkflow() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  // Trouver les setters prêts à être placés
  const { data: setters } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("role", "setter")
    .eq("onboarding_completed", true)
    .limit(10);

  // Find active placement rules
  const { data: rules } = await supabase
    .from("automation_rules")
    .select("id")
    .eq("type", "placement")
    .eq("is_active", true)
    .limit(1);

  if (!rules || rules.length === 0) {
    throw new Error("Aucune règle de placement active. Créez-en une d'abord.");
  }

  const ruleId = rules[0].id;

  // Find entrepreneurs with active listings
  const { data: entrepreneurs } = await supabase
    .from("marketplace_listings")
    .select("entrepreneur_id")
    .eq("is_active", true)
    .limit(10);

  if (!setters || setters.length === 0 || !entrepreneurs || entrepreneurs.length === 0) {
    throw new Error("Pas assez de setters ou d'entrepreneurs disponibles pour le placement.");
  }

  // Create execution records pairing setters with entrepreneurs
  const executions = setters.map((setter, i) => ({
    rule_id: ruleId,
    target_user_id: setter.id,
    status: "completed",
    executed_at: new Date().toISOString(),
    result: {
      matched_entrepreneur_id: entrepreneurs[i % entrepreneurs.length]?.entrepreneur_id || null,
      setter_name: setter.full_name,
      action: "placement_match",
    },
  }));

  const { error } = await supabase
    .from("automation_executions")
    .insert(executions);

  if (error) throw new Error(error.message);
  revalidatePath("/automation/placement");
  return { matched: executions.length };
}

/**
 * Check for clients whose contract/subscription ends within 30 days
 * and trigger an upsell notification sequence.
 */
export async function runUpsellSequence() {
  const supabase = await createClient();
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

  // Find contracts expiring within 30 days
  const { data: expiringContracts } = await supabase
    .from("contracts")
    .select("id, client_id, title, end_date, profiles!contracts_client_id_fkey(full_name, email)")
    .eq("status", "active")
    .lte("end_date", thirtyDaysFromNow)
    .gte("end_date", now.toISOString());

  if (!expiringContracts || expiringContracts.length === 0) {
    return { processed: 0 };
  }

  const alerts: Array<{ user_id: string; title: string; body: string; type: string; link: string }> = [];

  for (const contract of expiringContracts) {
    const clientId = contract.client_id;
    if (!clientId) continue;

    const profile = Array.isArray(contract.profiles) ? contract.profiles[0] : contract.profiles;
    const clientName = (profile as { full_name?: string })?.full_name || "Client";
    const endDate = new Date(contract.end_date);
    const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    // Check if already notified for this contract
    const { data: existing } = await supabase
      .from("notifications")
      .select("id")
      .eq("user_id", clientId)
      .eq("type", "upsell_renewal")
      .gte("created_at", new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .limit(1);

    if (existing && existing.length > 0) continue;

    // Notify client
    alerts.push({
      user_id: clientId,
      title: "Ton accompagnement se termine bientot",
      body: `Il te reste ${daysLeft} jours. Decouvre nos offres de suivi pour continuer ta progression !`,
      type: "upsell_renewal",
      link: "/settings/subscription",
    });

    // Notify admins
    const { data: admins } = await supabase
      .from("profiles")
      .select("id")
      .in("role", ["admin", "manager"]);

    for (const admin of admins || []) {
      alerts.push({
        user_id: admin.id,
        title: `Renouvellement : ${clientName}`,
        body: `Contrat "${contract.title}" expire dans ${daysLeft} jours. Action de retention recommandee.`,
        type: "upsell_renewal",
        link: "/contracts",
      });
    }
  }

  if (alerts.length > 0) {
    await supabase.from("notifications").insert(
      alerts.map((a) => ({ ...a, read: false }))
    );
  }

  revalidatePath("/notifications");
  return { processed: expiringContracts.length, alertsSent: alerts.length };
}
