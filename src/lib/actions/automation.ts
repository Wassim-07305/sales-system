"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isTableMissing(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  const msg = (error.message || "").toLowerCase();
  return (
    msg.includes("relation") && msg.includes("does not exist") ||
    error.code === "42P01"
  );
}

// ---------------------------------------------------------------------------
// CRUD — Automation Rules
// ---------------------------------------------------------------------------

export async function getAutomationRules(type?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  try {
    let query = supabase
      .from("automation_rules")
      .select("*")
      .order("created_at", { ascending: false });

    if (type) {
      query = query.eq("type", type);
    }

    const { data, error } = await query;
    if (error) {
      if (isTableMissing(error)) return [];
      throw new Error(error.message);
    }
    return data || [];
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("does not exist")) return [];
    throw err;
  }
}

export async function createAutomationRule(ruleData: {
  name: string;
  type: "nurturing" | "upsell" | "placement" | "general";
  trigger_conditions: Record<string, unknown>;
  actions: unknown[];
  is_active?: boolean;
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
      is_active: ruleData.is_active ?? true,
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

  // Clean up related executions first
  try {
    await supabase
      .from("automation_executions")
      .delete()
      .eq("rule_id", id);
  } catch {
    // executions table may not exist — ignore
  }

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

// ---------------------------------------------------------------------------
// Executions / Logs
// ---------------------------------------------------------------------------

export async function getAutomationExecutions(ruleId?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  try {
    let query = supabase
      .from("automation_executions")
      .select("*, rule:automation_rules(id, name, type), target_user:profiles(id, full_name)")
      .order("created_at", { ascending: false })
      .limit(50);

    if (ruleId) {
      query = query.eq("rule_id", ruleId);
    }

    const { data, error } = await query;
    if (error) {
      if (isTableMissing(error)) return [];
      throw new Error(error.message);
    }
    return data || [];
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("does not exist")) return [];
    throw err;
  }
}

/**
 * Returns recent automation logs (alias for executions with extra metadata).
 * Includes today-only filter option.
 */
export async function getAutomationLogs(options?: { todayOnly?: boolean }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  try {
    let query = supabase
      .from("automation_executions")
      .select("*, rule:automation_rules(id, name, type), target_user:profiles(id, full_name)")
      .order("created_at", { ascending: false })
      .limit(100);

    if (options?.todayOnly) {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      query = query.gte("created_at", todayStart.toISOString());
    }

    const { data, error } = await query;
    if (error) {
      if (isTableMissing(error)) return [];
      throw new Error(error.message);
    }
    return data || [];
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("does not exist")) return [];
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Manual automation check — runs all active rules
// ---------------------------------------------------------------------------

export async function runAutomationCheck() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  // Fetch all active rules
  const { data: rules, error: rulesErr } = await supabase
    .from("automation_rules")
    .select("*")
    .eq("is_active", true);

  if (rulesErr) {
    if (isTableMissing(rulesErr)) return { checked: 0, triggered: 0 };
    throw new Error(rulesErr.message);
  }

  if (!rules || rules.length === 0) {
    return { checked: 0, triggered: 0 };
  }

  let triggered = 0;

  for (const rule of rules) {
    const conditions = (rule.trigger_conditions || {}) as Record<string, unknown>;
    const event = conditions.event as string | undefined;

    try {
      // --- Nurturing: no-activity checks ---
      if (rule.type === "nurturing" && (event === "no_activity_7d" || event === "no_activity_14d")) {
        const days = event === "no_activity_7d" ? 7 : 14;
        const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

        const { data: staleDeals } = await supabase
          .from("deals")
          .select("id, contact_id")
          .lt("updated_at", cutoff)
          .neq("stage", "Client Signé")
          .limit(20);

        for (const deal of staleDeals || []) {
          // Avoid duplicate executions today
          const todayStart = new Date();
          todayStart.setHours(0, 0, 0, 0);
          const { data: existing } = await supabase
            .from("automation_executions")
            .select("id")
            .eq("rule_id", rule.id)
            .eq("target_user_id", deal.contact_id)
            .gte("created_at", todayStart.toISOString())
            .limit(1);

          if (existing && existing.length > 0) continue;

          await supabase.from("automation_executions").insert({
            rule_id: rule.id,
            target_user_id: deal.contact_id,
            status: "completed",
            executed_at: new Date().toISOString(),
            result: { action: "nurturing_reminder", deal_id: deal.id, days_inactive: days },
          });
          triggered++;
        }
      }

      // --- Upsell: contract renewal checks ---
      if (rule.type === "upsell" && event === "subscription_renewal") {
        const thirtyDays = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        const now = new Date().toISOString();

        const { data: expiring } = await supabase
          .from("contracts")
          .select("id, client_id")
          .eq("status", "active")
          .lte("end_date", thirtyDays)
          .gte("end_date", now)
          .limit(20);

        for (const contract of expiring || []) {
          if (!contract.client_id) continue;

          const todayStart = new Date();
          todayStart.setHours(0, 0, 0, 0);
          const { data: existing } = await supabase
            .from("automation_executions")
            .select("id")
            .eq("rule_id", rule.id)
            .eq("target_user_id", contract.client_id)
            .gte("created_at", todayStart.toISOString())
            .limit(1);

          if (existing && existing.length > 0) continue;

          await supabase.from("automation_executions").insert({
            rule_id: rule.id,
            target_user_id: contract.client_id,
            status: "completed",
            executed_at: new Date().toISOString(),
            result: { action: "upsell_renewal_check", contract_id: contract.id },
          });
          triggered++;
        }
      }

      // --- Placement: setter matching ---
      if (rule.type === "placement") {
        const { data: setters } = await supabase
          .from("profiles")
          .select("id, full_name")
          .eq("role", "setter")
          .eq("onboarding_completed", true)
          .limit(5);

        const { data: entrepreneurs } = await supabase
          .from("marketplace_listings")
          .select("entrepreneur_id")
          .eq("is_active", true)
          .limit(5);

        if (setters && setters.length > 0 && entrepreneurs && entrepreneurs.length > 0) {
          for (let i = 0; i < setters.length; i++) {
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const { data: existing } = await supabase
              .from("automation_executions")
              .select("id")
              .eq("rule_id", rule.id)
              .eq("target_user_id", setters[i].id)
              .gte("created_at", todayStart.toISOString())
              .limit(1);

            if (existing && existing.length > 0) continue;

            await supabase.from("automation_executions").insert({
              rule_id: rule.id,
              target_user_id: setters[i].id,
              status: "completed",
              executed_at: new Date().toISOString(),
              result: {
                action: "placement_match",
                matched_entrepreneur_id: entrepreneurs[i % entrepreneurs.length]?.entrepreneur_id || null,
                setter_name: setters[i].full_name,
              },
            });
            triggered++;
          }
        }
      }

      // --- General rules ---
      if (rule.type === "general") {
        // Log that the rule was checked
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const { data: existing } = await supabase
          .from("automation_executions")
          .select("id")
          .eq("rule_id", rule.id)
          .gte("created_at", todayStart.toISOString())
          .limit(1);

        if (existing && existing.length > 0) continue;

        // For general rules, evaluate the trigger
        if (event === "no_response_2_days") {
          const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
          const { data: staleContacts } = await supabase
            .from("contacts")
            .select("id")
            .lt("updated_at", twoDaysAgo)
            .limit(10);

          for (const contact of staleContacts || []) {
            await supabase.from("automation_executions").insert({
              rule_id: rule.id,
              target_user_id: contact.id,
              status: "completed",
              executed_at: new Date().toISOString(),
              result: { action: conditions.action || "notify_manager", trigger: event },
            });
            triggered++;
          }
        } else if (event === "new_lead") {
          // Check for leads created in the last hour without follow-up
          const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
          const { data: newLeads } = await supabase
            .from("contacts")
            .select("id")
            .gte("created_at", oneHourAgo)
            .limit(10);

          for (const lead of newLeads || []) {
            await supabase.from("automation_executions").insert({
              rule_id: rule.id,
              target_user_id: lead.id,
              status: "completed",
              executed_at: new Date().toISOString(),
              result: { action: conditions.action || "create_task", trigger: event },
            });
            triggered++;
          }
        } else {
          // Generic check — just log execution
          await supabase.from("automation_executions").insert({
            rule_id: rule.id,
            target_user_id: user.id,
            status: "completed",
            executed_at: new Date().toISOString(),
            result: { action: "rule_checked", trigger: event || "manual" },
          });
          triggered++;
        }
      }
    } catch {
      // Individual rule failure should not break the whole check
      continue;
    }
  }

  revalidatePath("/automation");
  return { checked: rules.length, triggered };
}

// ---------------------------------------------------------------------------
// Placement Workflow
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Upsell Sequence
// ---------------------------------------------------------------------------

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
