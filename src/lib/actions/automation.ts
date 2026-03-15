"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { notify } from "@/lib/actions/notifications";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isTableMissing(
  error: { message?: string; code?: string } | null,
): boolean {
  if (!error) return false;
  const msg = (error.message || "").toLowerCase();
  return (
    (msg.includes("relation") && msg.includes("does not exist")) ||
    error.code === "42P01"
  );
}

// ---------------------------------------------------------------------------
// CRUD — Automation Rules
// ---------------------------------------------------------------------------

export async function getAutomationRules(type?: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
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
  const {
    data: { user },
  } = await supabase.auth.getUser();
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
  }>,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  // Ownership check: only the creator or admin/manager can update
  const { data: rule } = await supabase
    .from("automation_rules")
    .select("created_by")
    .eq("id", id)
    .single();
  if (!rule) throw new Error("Règle introuvable");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const isAdmin = ["admin", "manager"].includes(profile?.role || "");
  if (rule.created_by !== user.id && !isAdmin) {
    throw new Error("Accès refusé");
  }

  const { error } = await supabase
    .from("automation_rules")
    .update(ruleData)
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/automation");
}

export async function deleteAutomationRule(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  // Ownership check: only the creator or admin/manager can delete
  const { data: rule } = await supabase
    .from("automation_rules")
    .select("created_by")
    .eq("id", id)
    .single();
  if (!rule) throw new Error("Règle introuvable");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const isAdmin = ["admin", "manager"].includes(profile?.role || "");
  if (rule.created_by !== user.id && !isAdmin) {
    throw new Error("Accès refusé");
  }

  // Clean up related executions first
  try {
    await supabase.from("automation_executions").delete().eq("rule_id", id);
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
  const {
    data: { user },
  } = await supabase.auth.getUser();
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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  try {
    let query = supabase
      .from("automation_executions")
      .select(
        "*, rule:automation_rules(id, name, type), target_user:profiles(id, full_name)",
      )
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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  try {
    let query = supabase
      .from("automation_executions")
      .select(
        "*, rule:automation_rules(id, name, type), target_user:profiles(id, full_name)",
      )
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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  // Only admin/manager can trigger automation checks
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile || !["admin", "manager"].includes(profile.role)) {
    throw new Error("Accès réservé aux administrateurs");
  }

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
    const conditions = (rule.trigger_conditions || {}) as Record<
      string,
      unknown
    >;
    const event = conditions.event as string | undefined;

    try {
      // --- Nurturing: no-activity checks ---
      if (
        rule.type === "nurturing" &&
        (event === "no_activity_7d" || event === "no_activity_14d")
      ) {
        const days = event === "no_activity_7d" ? 7 : 14;
        const cutoff = new Date(
          Date.now() - days * 24 * 60 * 60 * 1000,
        ).toISOString();

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
            result: {
              action: "nurturing_reminder",
              deal_id: deal.id,
              days_inactive: days,
            },
          });
          triggered++;
        }
      }

      // --- Upsell: contract renewal checks ---
      if (rule.type === "upsell" && event === "subscription_renewal") {
        const thirtyDays = new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000,
        ).toISOString();
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
            result: {
              action: "upsell_renewal_check",
              contract_id: contract.id,
            },
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

        if (
          setters &&
          setters.length > 0 &&
          entrepreneurs &&
          entrepreneurs.length > 0
        ) {
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
                matched_entrepreneur_id:
                  entrepreneurs[i % entrepreneurs.length]?.entrepreneur_id ||
                  null,
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
          const twoDaysAgo = new Date(
            Date.now() - 2 * 24 * 60 * 60 * 1000,
          ).toISOString();
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
              result: {
                action: conditions.action || "notify_manager",
                trigger: event,
              },
            });
            triggered++;
          }
        } else if (event === "new_lead") {
          // Check for leads created in the last hour without follow-up
          const oneHourAgo = new Date(
            Date.now() - 60 * 60 * 1000,
          ).toISOString();
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
              result: {
                action: conditions.action || "create_task",
                trigger: event,
              },
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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  // Only admin/manager can run placement workflows
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile || !["admin", "manager"].includes(profile.role)) {
    throw new Error("Accès réservé aux administrateurs");
  }

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

  if (
    !setters ||
    setters.length === 0 ||
    !entrepreneurs ||
    entrepreneurs.length === 0
  ) {
    throw new Error(
      "Pas assez de setters ou d'entrepreneurs disponibles pour le placement.",
    );
  }

  // Create execution records pairing setters with entrepreneurs
  const executions = setters.map((setter, i) => ({
    rule_id: ruleId,
    target_user_id: setter.id,
    status: "completed",
    executed_at: new Date().toISOString(),
    result: {
      matched_entrepreneur_id:
        entrepreneurs[i % entrepreneurs.length]?.entrepreneur_id || null,
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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  // Only admin/manager can run upsell sequences
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile || !["admin", "manager"].includes(profile.role)) {
    throw new Error("Accès réservé aux administrateurs");
  }

  const now = new Date();
  const thirtyDaysFromNow = new Date(
    now.getTime() + 30 * 24 * 60 * 60 * 1000,
  ).toISOString();

  // Find contracts expiring within 30 days
  const { data: expiringContracts } = await supabase
    .from("contracts")
    .select(
      "id, client_id, title, end_date, profiles!contracts_client_id_fkey(full_name, email)",
    )
    .eq("status", "active")
    .lte("end_date", thirtyDaysFromNow)
    .gte("end_date", now.toISOString());

  if (!expiringContracts || expiringContracts.length === 0) {
    return { processed: 0 };
  }

  const alerts: Array<{
    user_id: string;
    title: string;
    body: string;
    type: string;
    link: string;
  }> = [];

  for (const contract of expiringContracts) {
    const clientId = contract.client_id;
    if (!clientId) continue;

    const profile = Array.isArray(contract.profiles)
      ? contract.profiles[0]
      : contract.profiles;
    const clientName =
      (profile as { full_name?: string })?.full_name || "Client";
    const endDate = new Date(contract.end_date);
    const daysLeft = Math.ceil(
      (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    // Check if already notified for this contract
    const { data: existing } = await supabase
      .from("notifications")
      .select("id")
      .eq("user_id", clientId)
      .eq("type", "upsell_renewal")
      .gte(
        "created_at",
        new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      )
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

  for (const a of alerts) {
    await notify(a.user_id, a.title, a.body, { type: a.type, link: a.link });
  }

  revalidatePath("/notifications");
  return { processed: expiringContracts.length, alertsSent: alerts.length };
}

// ---------------------------------------------------------------------------
// Auto-Relance (Follow-up) Workflow
// ---------------------------------------------------------------------------

export interface RelanceConfig {
  prospect_id: string;
  platform: string;
  message_j2: string;
  message_j3: string;
  delay_j2_hours?: number;
  delay_j3_hours?: number;
}

/**
 * Create a relance (follow-up) workflow for a prospect.
 * J+2: sends message_j2 if no response. J+3: sends message_j3 if still no response.
 */
export async function createRelanceWorkflow(config: RelanceConfig) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifie");

  const { data, error } = await supabase
    .from("relance_workflows")
    .insert({
      prospect_id: config.prospect_id,
      platform: config.platform,
      created_by: user.id,
      status: "pending",
      delay_j2_hours: config.delay_j2_hours ?? 48,
      delay_j3_hours: config.delay_j3_hours ?? 72,
      message_j2: config.message_j2,
      message_j3: config.message_j3,
    })
    .select()
    .single();

  if (error) {
    if (isTableMissing(error)) {
      // Table does not exist yet — return a mock result
      return { id: "mock", prospect_id: config.prospect_id, status: "pending" };
    }
    throw new Error(error.message);
  }

  revalidatePath("/prospecting");
  revalidatePath("/automation");
  return data;
}

/**
 * Process all pending relances: check timing and send messages via Unipile.
 * Called by cron or manually from the automation dashboard.
 */
export async function processRelances(): Promise<{
  processed: number;
  sent: number;
  errors: number;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifie");

  let processed = 0;
  let sent = 0;
  let errors = 0;

  try {
    const { data: pendingRelances, error } = await supabase
      .from("relance_workflows")
      .select("*, prospect:prospects(id, name, platform, profile_url, status)")
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    if (error) {
      if (isTableMissing(error)) return { processed: 0, sent: 0, errors: 0 };
      throw new Error(error.message);
    }

    if (!pendingRelances || pendingRelances.length === 0) {
      return { processed: 0, sent: 0, errors: 0 };
    }

    const now = Date.now();
    let sendUnipileMessage: typeof import("@/lib/actions/unipile").sendUnipileMessage;
    let accounts: Array<{
      id: string;
      provider: string;
      channel: string;
      name: string;
      status: string;
    }> = [];

    try {
      const unipileModule = await import("@/lib/actions/unipile");
      sendUnipileMessage = unipileModule.sendUnipileMessage;
      const status = await unipileModule.getUnipileStatus();
      accounts = status.accounts || [];
    } catch {
      console.warn("[processRelances] Unipile non disponible");
      return { processed: 0, sent: 0, errors: 0 };
    }

    if (accounts.length === 0) {
      return { processed: 0, sent: 0, errors: 0 };
    }

    for (const relance of pendingRelances) {
      processed++;
      const createdAt = new Date(relance.created_at).getTime();
      const j2Threshold =
        createdAt + (relance.delay_j2_hours || 48) * 60 * 60 * 1000;
      const j3Threshold =
        createdAt + (relance.delay_j3_hours || 72) * 60 * 60 * 1000;

      // Check if the prospect has responded (status changed to 'replied')
      const prospect = Array.isArray(relance.prospect)
        ? relance.prospect[0]
        : relance.prospect;
      if (prospect?.status === "replied" || prospect?.status === "booked") {
        await supabase
          .from("relance_workflows")
          .update({
            status: "responded",
            responded_at: new Date().toISOString(),
          })
          .eq("id", relance.id);
        continue;
      }

      // Find the correct Unipile account for this platform
      const providerName =
        relance.platform === "linkedin" ? "LINKEDIN" : "INSTAGRAM";
      const account = accounts.find(
        (a: { provider: string }) => a.provider.toUpperCase() === providerName,
      );
      if (!account) continue;

      try {
        // J+3 check first (takes priority if both thresholds passed)
        if (!relance.j3_sent_at && now >= j3Threshold && relance.j2_sent_at) {
          await sendUnipileMessage({
            accountId: account.id,
            recipientId: prospect?.profile_url || relance.prospect_id,
            text: relance.message_j3,
            channel: relance.platform,
            prospectId: relance.prospect_id,
          });

          await supabase
            .from("relance_workflows")
            .update({
              j3_sent_at: new Date().toISOString(),
              status: "sent",
            })
            .eq("id", relance.id);

          // Tag the inbox_messages entry (already created by sendUnipileMessage) with relance metadata
          try {
            const { data: lastMsg } = await supabase
              .from("inbox_messages")
              .select("id")
              .eq("user_id", user.id)
              .eq("prospect_id", relance.prospect_id)
              .eq("direction", "outbound")
              .order("created_at", { ascending: false })
              .limit(1)
              .single();

            if (lastMsg) {
              await supabase
                .from("inbox_messages")
                .update({
                  metadata: {
                    source: "auto_relance",
                    step: "j3",
                    relance_id: relance.id,
                  },
                })
                .eq("id", lastMsg.id);
            }
          } catch {
            // Non-critical
          }

          sent++;
        }
        // J+2 check
        else if (!relance.j2_sent_at && now >= j2Threshold) {
          await sendUnipileMessage({
            accountId: account.id,
            recipientId: prospect?.profile_url || relance.prospect_id,
            text: relance.message_j2,
            channel: relance.platform,
            prospectId: relance.prospect_id,
          });

          await supabase
            .from("relance_workflows")
            .update({
              j2_sent_at: new Date().toISOString(),
            })
            .eq("id", relance.id);

          // Tag the inbox_messages entry (already created by sendUnipileMessage) with relance metadata
          try {
            const { data: lastMsg } = await supabase
              .from("inbox_messages")
              .select("id")
              .eq("user_id", user.id)
              .eq("prospect_id", relance.prospect_id)
              .eq("direction", "outbound")
              .order("created_at", { ascending: false })
              .limit(1)
              .single();

            if (lastMsg) {
              await supabase
                .from("inbox_messages")
                .update({
                  metadata: {
                    source: "auto_relance",
                    step: "j2",
                    relance_id: relance.id,
                  },
                })
                .eq("id", lastMsg.id);
            }
          } catch {
            // Non-critical
          }

          sent++;
        }
      } catch (err) {
        console.error(
          `Relance error for prospect ${relance.prospect_id}:`,
          err,
        );
        errors++;
      }
    }
  } catch (err) {
    console.error("processRelances error:", err);
  }

  revalidatePath("/prospecting");
  revalidatePath("/automation");
  return { processed, sent, errors };
}

/**
 * Cancel a pending relance workflow for a given prospect.
 */
export async function cancelRelance(prospectId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifie");

  try {
    const { error } = await supabase
      .from("relance_workflows")
      .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
      .eq("prospect_id", prospectId)
      .eq("status", "pending");

    if (error && !isTableMissing(error)) throw new Error(error.message);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!msg.includes("does not exist")) throw err;
  }

  revalidatePath("/prospecting");
  revalidatePath("/automation");
}

/**
 * Get relance workflows, optionally filtered by prospect.
 */
export async function getRelanceWorkflows(prospectId?: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifie");

  try {
    let query = supabase
      .from("relance_workflows")
      .select("*, prospect:prospects(id, name, platform, status)")
      .order("created_at", { ascending: false })
      .limit(50);

    if (prospectId) {
      query = query.eq("prospect_id", prospectId);
    }

    const { data, error } = await query;
    if (error) {
      if (isTableMissing(error)) return [];
      throw new Error(error.message);
    }
    return data || [];
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("does not exist")) return [];
    throw err;
  }
}

// ---------------------------------------------------------------------------
// AI Message Personalization
// ---------------------------------------------------------------------------

/**
 * Generate a personalized message using AI based on prospect profile and a template.
 * Variables: {nom}, {activite}, {dernier_post}
 */
export async function generatePersonalizedMessage(
  prospect: {
    name: string;
    platform?: string | null;
    activity?: string | null;
    recent_post?: string | null;
    profile_url?: string | null;
    notes?: string | null;
  },
  template: string,
): Promise<{ message: string; error?: string }> {
  try {
    // First do basic variable replacement
    let message = template
      .replace(/\{nom\}/g, prospect.name || "")
      .replace(/\{activite\}/g, prospect.activity || "votre activite")
      .replace(
        /\{dernier_post\}/g,
        prospect.recent_post || "votre dernier contenu",
      );

    // Use AI to further personalize
    try {
      const { aiComplete } = await import("@/lib/ai/client");
      const aiMessage = await aiComplete(
        `Tu es un expert en prospection commerciale via ${prospect.platform || "les reseaux sociaux"}.
Personnalise ce message de prospection pour le rendre plus naturel et engageant.
Ne change pas le sens du message, juste rends-le plus humain et personnel.

Informations sur le prospect :
- Nom : ${prospect.name}
- Plateforme : ${prospect.platform || "inconnue"}
- Activite : ${prospect.activity || "non renseignee"}
- Dernier post/contenu : ${prospect.recent_post || "non disponible"}
- Notes : ${prospect.notes || "aucune"}

Message a personnaliser :
${message}

Reponds UNIQUEMENT avec le message personnalise, sans guillemets, sans explication.`,
        {
          system:
            "Tu es un assistant de vente expert en prospection sociale. Ecris uniquement en francais. Sois naturel, pas commercial.",
          maxTokens: 300,
          temperature: 0.7,
        },
      );

      if (aiMessage && aiMessage.trim().length > 10) {
        message = aiMessage.trim();
      }
    } catch {
      // AI failed — use the template-based message
      console.warn(
        "[AI Personalization] OpenRouter indisponible, utilisation du template basique",
      );
    }

    return { message };
  } catch (err) {
    console.error("generatePersonalizedMessage error:", err);
    return {
      message: template.replace(/\{nom\}/g, prospect.name || ""),
      error: "Erreur de personnalisation IA",
    };
  }
}

/**
 * Send an AI-personalized message to a prospect via Unipile.
 */
export async function sendAIMessage(
  prospectId: string,
  platform: string,
): Promise<{ success: boolean; message?: string; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifie");

  // 1. Get prospect data
  const { data: prospect } = await supabase
    .from("prospects")
    .select("*")
    .eq("id", prospectId)
    .single();

  if (!prospect) return { success: false, error: "Prospect introuvable" };

  // 2. Get AI mode config for template
  const { data: config } = await supabase
    .from("ai_mode_configs")
    .select(
      "auto_send_template, auto_send_mode, auto_send_enabled, auto_send_platforms",
    )
    .eq("user_id", user.id)
    .single();

  if (!config?.auto_send_enabled) {
    return { success: false, error: "Envoi automatique IA desactive" };
  }

  const platforms = (config.auto_send_platforms as string[]) || [];
  if (!platforms.includes(platform)) {
    return {
      success: false,
      error: `Plateforme ${platform} non activee pour l'envoi IA`,
    };
  }

  const template =
    (config.auto_send_template as string) ||
    "Bonjour {nom}, j'ai vu {dernier_post} et ca m'a interpelle !";

  // 3. Generate personalized message
  const metadata =
    typeof prospect.metadata === "object" && prospect.metadata
      ? (prospect.metadata as Record<string, unknown>)
      : {};
  const enrichment = metadata.enrichment as Record<string, unknown> | undefined;

  const { message } = await generatePersonalizedMessage(
    {
      name: prospect.name,
      platform: prospect.platform,
      activity:
        (enrichment?.headline as string) ||
        (prospect.notes as string | null) ||
        null,
      recent_post: (enrichment?.recent_post as string) || null,
      profile_url: prospect.profile_url,
      notes: prospect.notes as string | null,
    },
    template,
  );

  // 4. Check AI mode — if critical_validation, don't auto-send
  if (config.auto_send_mode === "critical_validation") {
    return { success: true, message, error: "MODE_VALIDATION_REQUISE" };
  }

  if (config.auto_send_mode === "full_human") {
    return { success: true, message, error: "MODE_HUMAIN" };
  }

  // 5. Send via Unipile
  let getUnipileStatus: typeof import("@/lib/actions/unipile").getUnipileStatus;
  let sendUnipileMessage: typeof import("@/lib/actions/unipile").sendUnipileMessage;

  try {
    const unipileModule = await import("@/lib/actions/unipile");
    getUnipileStatus = unipileModule.getUnipileStatus;
    sendUnipileMessage = unipileModule.sendUnipileMessage;
  } catch {
    return { success: false, error: "Unipile non disponible" };
  }

  const status = await getUnipileStatus();
  const providerName = platform === "linkedin" ? "LINKEDIN" : "INSTAGRAM";
  const account = status.accounts.find(
    (a) => a.provider.toUpperCase() === providerName,
  );

  if (!account) {
    return {
      success: false,
      error: `Aucun compte ${platform} connecte via Unipile`,
    };
  }

  const result = await sendUnipileMessage({
    accountId: account.id,
    recipientId: prospect.profile_url || prospectId,
    text: message,
    channel: platform,
    prospectId,
  });

  if (result.error) {
    return { success: false, error: result.error };
  }

  // 6. Update the inbox_messages entry added by sendUnipileMessage with AI metadata
  try {
    const { data: lastMsg } = await supabase
      .from("inbox_messages")
      .select("id")
      .eq("user_id", user.id)
      .eq("prospect_id", prospectId)
      .eq("direction", "outbound")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (lastMsg) {
      await supabase
        .from("inbox_messages")
        .update({
          metadata: { source: "ai_auto_send", ai_mode: config.auto_send_mode },
        })
        .eq("id", lastMsg.id);
    }
  } catch {
    // Non-critical — metadata tagging failed
  }

  // 7. Update prospect status
  await supabase
    .from("prospects")
    .update({
      status: "contacted",
      last_message_at: new Date().toISOString(),
    })
    .eq("id", prospectId);

  revalidatePath("/prospecting");
  revalidatePath("/inbox");
  return { success: true, message };
}

// ---------------------------------------------------------------------------
// Human Escalation
// ---------------------------------------------------------------------------

/**
 * Escalate a conversation to a human agent.
 * Sends push notification to the assigned setter and marks the conversation.
 */
export async function escalateToHuman(
  conversationId: string,
  reason: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifie");

  // 1. Mark the conversation as needing human attention
  const { error: updateError } = await supabase
    .from("dm_conversations")
    .update({
      needs_human: true,
      escalation_reason: reason,
      escalated_at: new Date().toISOString(),
    })
    .eq("id", conversationId);

  if (updateError) {
    // Column or table may not exist yet — log as inbox_messages instead
    console.warn(
      "[escalateToHuman] dm_conversations update failed:",
      updateError.message,
    );
    try {
      await supabase.from("inbox_messages").insert({
        user_id: user.id,
        channel: "system",
        direction: "inbound",
        content: `[ESCALATION] ${reason}`,
        status: "received",
        metadata: {
          type: "escalation",
          conversation_id: conversationId,
          reason,
          escalated_at: new Date().toISOString(),
        },
        created_at: new Date().toISOString(),
      });
    } catch {
      // inbox_messages also missing — continue anyway, notification will still be sent
    }
  }

  // 2. Find the assigned setter or admin to notify
  let targetUserId = user.id;

  // Try to find the conversation's assigned setter
  const { data: conv } = await supabase
    .from("dm_conversations")
    .select("prospect_id")
    .eq("id", conversationId)
    .single();

  if (conv?.prospect_id) {
    const { data: prospect } = await supabase
      .from("prospects")
      .select("assigned_setter_id")
      .eq("id", conv.prospect_id)
      .single();

    if (prospect?.assigned_setter_id) {
      targetUserId = prospect.assigned_setter_id;
    }
  }

  // If no setter assigned, notify first admin
  if (targetUserId === user.id) {
    const { data: admins } = await supabase
      .from("profiles")
      .select("id")
      .in("role", ["admin", "manager"])
      .limit(1);

    if (admins && admins.length > 0) targetUserId = admins[0].id;
  }

  // 3. Send notification (DB insert + push) via notify helper
  await notify(
    targetUserId,
    "Escalade IA — Intervention humaine requise",
    `Raison : ${reason}. La conversation necessite une reponse humaine.`,
    { type: "escalation", link: "/inbox" },
  );

  revalidatePath("/inbox");
  revalidatePath("/notifications");
  return { success: true };
}

// ---------------------------------------------------------------------------
// Instagram Story Auto-Reaction
// ---------------------------------------------------------------------------

/**
 * React to an Instagram story via Unipile API.
 */
export async function reactToInstagramStory(
  storyUrl: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifie");

  // Get AI mode config for story reaction settings
  const { data: config } = await supabase
    .from("ai_mode_configs")
    .select("story_reaction_enabled, story_reaction_emoji")
    .eq("user_id", user.id)
    .single();

  if (!config?.story_reaction_enabled) {
    return { success: false, error: "Reaction aux stories desactivee" };
  }

  const emoji = (config.story_reaction_emoji as string) || "\u{1F525}";

  // Find Instagram account via Unipile
  let igAccount: { id: string; provider: string } | undefined;
  let dsn: string | null = null;
  let apiKey: string | null = null;

  try {
    const { getUnipileStatus } = await import("@/lib/actions/unipile");
    const status = await getUnipileStatus();
    igAccount = status.accounts.find(
      (a) => a.provider.toUpperCase() === "INSTAGRAM",
    );

    if (!igAccount) {
      return { success: false, error: "Aucun compte Instagram connecte" };
    }

    // Get Unipile credentials for direct REST call
    const { getApiKey } = await import("@/lib/api-keys");
    dsn = process.env.UNIPILE_DSN || (await getApiKey("UNIPILE_DSN"));
    apiKey =
      process.env.UNIPILE_API_KEY || (await getApiKey("UNIPILE_API_KEY"));
  } catch {
    return { success: false, error: "Erreur de connexion Unipile" };
  }

  if (!dsn || !apiKey) {
    return { success: false, error: "Unipile non configure" };
  }

  try {
    // Ensure DSN has protocol
    const baseUrl = dsn.startsWith("http") ? dsn : `https://${dsn}`;

    // Use Unipile REST API to react to story
    const res = await fetch(`${baseUrl}/api/v1/posts/reactions`, {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        account_id: igAccount.id,
        post_url: storyUrl,
        reaction: emoji,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return { success: false, error: `Erreur reaction story : ${errText}` };
    }

    return { success: true };
  } catch (err) {
    console.error("reactToInstagramStory error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erreur de reaction",
    };
  }
}

// ─── Feature #33: Mode Duo IA + Humain — Détection moments clés enrichie ───

const OBJECTION_KEYWORDS = [
  "trop cher",
  "pas intéressé",
  "j'ai déjà",
  "pas le moment",
  "c'est quoi le prix",
  "quel est le prix",
  "combien ça coûte",
  "je n'ai pas le budget",
  "pas besoin",
  "pas convaincu",
  "j'hésite",
  "laisse tomber",
  "non merci",
];

const CALL_REQUEST_KEYWORDS = [
  "on peut s'appeler",
  "disponible quand",
  "un call",
  "un rdv",
  "un appel",
  "on se call",
  "prendre rdv",
  "réserver un créneau",
  "booker",
  "quand es-tu dispo",
  "calendrier",
  "meeting",
];

export type EscalationMoment =
  | "objection"
  | "call_request"
  | "high_engagement"
  | "out_of_scope";

export async function detectEscalationMoment(
  messageText: string,
  consecutiveMessages?: number,
): Promise<EscalationMoment | null> {
  const lower = messageText.toLowerCase();

  // Objection détectée
  if (OBJECTION_KEYWORDS.some((kw) => lower.includes(kw))) {
    return "objection";
  }

  // Demande d'appel/RDV
  if (CALL_REQUEST_KEYWORDS.some((kw) => lower.includes(kw))) {
    return "call_request";
  }

  // Prospect très engagé (message long ou 3+ messages consécutifs)
  if (
    (consecutiveMessages && consecutiveMessages >= 3) ||
    messageText.length > 500
  ) {
    return "high_engagement";
  }

  // Question technique (contient "?") avec des mots complexes
  if (
    lower.includes("?") &&
    (lower.includes("technique") ||
      lower.includes("comment ça marche") ||
      lower.includes("concrètement"))
  ) {
    return "out_of_scope";
  }

  return null;
}

export async function getEscalationLabel(
  moment: EscalationMoment,
): Promise<string> {
  switch (moment) {
    case "objection":
      return "Objection détectée";
    case "call_request":
      return "Demande d'appel";
    case "high_engagement":
      return "Prospect très engagé";
    case "out_of_scope":
      return "Question hors-scope IA";
  }
}

// ─── Feature #78: Création automatique contrat de placement ───

export async function autoCreatePlacementContract(
  setterId: string,
  entrepreneurId: string,
) {
  const supabase = await createClient();

  // Récupérer les profils
  const [setterRes, entrepreneurRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", setterId)
      .single(),
    supabase
      .from("profiles")
      .select("full_name, company, email")
      .eq("id", entrepreneurId)
      .single(),
  ]);

  const setter = setterRes.data;
  const entrepreneur = entrepreneurRes.data;
  if (!setter || !entrepreneur) return { error: "Profils introuvables" };

  // Vérifier si un contrat existe déjà
  const { data: existing } = await supabase
    .from("contracts")
    .select("id")
    .eq("client_id", setterId)
    .ilike("title", "%placement%")
    .eq("status", "draft")
    .limit(1);

  if (existing && existing.length > 0) {
    return {
      success: true,
      contractId: existing[0].id,
      message: "Contrat existant",
    };
  }

  // Créer le brouillon de contrat
  const title = `Contrat de placement — ${setter.full_name || "Setter"} chez ${entrepreneur.company || entrepreneur.full_name || "Entrepreneur"}`;

  const { data: contract, error } = await supabase
    .from("contracts")
    .insert({
      title,
      client_id: setterId,
      status: "draft",
      amount: 0, // L'admin définira le montant
      content: JSON.stringify({
        type: "placement",
        setter_id: setterId,
        setter_name: setter.full_name,
        entrepreneur_id: entrepreneurId,
        entrepreneur_name: entrepreneur.full_name,
        entrepreneur_company: entrepreneur.company,
        generated_at: new Date().toISOString(),
        template: "placement_standard",
      }),
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  // Notifier l'admin
  const { data: admins } = await supabase
    .from("profiles")
    .select("id")
    .in("role", ["admin", "manager"]);

  if (admins && admins.length > 0) {
    const { notify: notifyFn } = await import("@/lib/actions/notifications");
    for (const admin of admins) {
      await notifyFn(
        admin.id,
        "Contrat de placement généré",
        `${setter.full_name} → ${entrepreneur.company || entrepreneur.full_name}. Vérifiez et envoyez le contrat.`,
        { type: "contract_generated", link: `/contracts/${contract?.id}` },
      );
    }
  }

  return { success: true, contractId: contract?.id };
}
