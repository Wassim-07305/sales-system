"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { logAuditEvent } from "@/lib/actions/audit-log";
import { notify } from "@/lib/actions/notifications";

// ─── Queries ────────────────────────────────────────────────────────

export async function getDealById(dealId: string) {
  try {
    const { supabase } = await requireAuth();

    const { data, error } = await supabase
      .from("deals")
      .select(
        `
      *,
      contact:profiles!deals_contact_id_fkey(*),
      assigned_user:profiles!deals_assigned_to_fkey(*),
      stage:pipeline_stages(*)
    `,
      )
      .eq("id", dealId)
      .single();

    if (error) return { deal: null, error: error.message };
    return { deal: data, error: null };
  } catch {
    return { deal: null, error: "Non authentifié" };
  }
}

export async function getDealActivities(dealId: string) {
  try {
    const { supabase } = await requireAuth();

    const { data } = await supabase
      .from("deal_activities")
      .select("*, user:profiles(*)")
      .eq("deal_id", dealId)
      .order("created_at", { ascending: false })
      .limit(50);

    return data || [];
  } catch {
    return [];
  }
}

export async function getPipelineStages() {
  try {
    const { supabase } = await requireAuth();

    const { data } = await supabase
      .from("pipeline_stages")
      .select("*")
      .order("position", { ascending: true });
    return data || [];
  } catch {
    return [];
  }
}

export interface DealFilters {
  dateFrom?: string;
  dateTo?: string;
  amountMin?: number;
  amountMax?: number;
  assignedTo?: string;
  source?: string;
  sortBy?:
    | "value_asc"
    | "value_desc"
    | "created_at_asc"
    | "created_at_desc"
    | "title_asc"
    | "title_desc";
}

/**
 * Récupère les IDs des setters B2C assignés à un entrepreneur B2B.
 */
export async function getSetterIdsForEntrepreneur(
  entrepreneurId: string,
): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "client_b2c")
    .eq("matched_entrepreneur_id", entrepreneurId);

  return (data || []).map((s) => s.id);
}

export async function getFilteredDeals(filters: DealFilters) {
  try {
    const { supabase, user } = await requireAuth();

    // Determine role-based scoping
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    let query = supabase
      .from("deals")
      .select(
        "*, contact:profiles!deals_contact_id_fkey(*), assigned_user:profiles!deals_assigned_to_fkey(*), stage:pipeline_stages(*)",
      );

    // Role-based deal scoping
    if (profile?.role === "client_b2b") {
      // B2B: only see deals from their assigned setters
      const setterIds = await getSetterIdsForEntrepreneur(user.id);
      if (setterIds.length > 0) {
        query = query.in("assigned_to", setterIds);
      } else {
        return { deals: [], error: null };
      }
    } else if (profile?.role === "setter" || profile?.role === "closer") {
      // Setter/Closer: only their own deals
      query = query.eq("assigned_to", user.id);
    }
    // Admin/Manager: no scoping — see all deals

    // Date range filter
    if (filters.dateFrom) {
      query = query.gte("created_at", filters.dateFrom);
    }
    if (filters.dateTo) {
      // Add end-of-day to include the full day
      query = query.lte("created_at", filters.dateTo + "T23:59:59.999Z");
    }

    // Amount range filter
    if (filters.amountMin !== undefined && filters.amountMin > 0) {
      query = query.gte("value", filters.amountMin);
    }
    if (filters.amountMax !== undefined && filters.amountMax > 0) {
      query = query.lte("value", filters.amountMax);
    }

    // Assigned user filter
    if (filters.assignedTo && filters.assignedTo !== "all") {
      query = query.eq("assigned_to", filters.assignedTo);
    }

    // Source filter
    if (filters.source && filters.source !== "all") {
      query = query.eq("source", filters.source);
    }

    // Sorting
    switch (filters.sortBy) {
      case "value_asc":
        query = query.order("value", { ascending: true });
        break;
      case "value_desc":
        query = query.order("value", { ascending: false });
        break;
      case "created_at_asc":
        query = query.order("created_at", { ascending: true });
        break;
      case "title_asc":
        query = query.order("title", { ascending: true });
        break;
      case "title_desc":
        query = query.order("title", { ascending: false });
        break;
      case "created_at_desc":
      default:
        query = query.order("created_at", { ascending: false });
        break;
    }

    const { data, error } = await query;

    return { deals: data || [], error: error?.message };
  } catch {
    return { deals: [], error: "Non authentifié" };
  }
}

export async function getDealSources() {
  try {
    const { supabase } = await requireAuth();

    const { data } = await supabase
      .from("deals")
      .select("source")
      .not("source", "is", null)
      .limit(1000);

    const sources = [
      ...new Set((data || []).map((d) => d.source).filter(Boolean)),
    ] as string[];
    return sources;
  } catch {
    return [];
  }
}

export async function getTeamMembers() {
  try {
    const { supabase } = await requireAuth();

    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, role")
      .in("role", ["setter", "closer", "manager", "admin"]);

    return data || [];
  } catch {
    return [];
  }
}

export async function getRecentDeals(limit = 10) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("deals")
    .select(
      "id, title, value, stage_id, contact:profiles!deals_contact_id_fkey(full_name)",
    )
    .order("updated_at", { ascending: false })
    .limit(limit);
  return data || [];
}

export async function searchDeals(query: string) {
  const supabase = await createClient();
  const sanitized = query.trim().replace(/[%_\\]/g, (c) => `\\${c}`);
  const { data } = await supabase
    .from("deals")
    .select(
      "id, title, value, stage_id, contact:profiles!deals_contact_id_fkey(full_name)",
    )
    .ilike("title", `%${sanitized}%`)
    .limit(20);
  return data || [];
}

export async function addQuickNote(params: {
  dealId: string;
  content: string;
  type: string;
}) {
  try {
    const { supabase, user } = await requireAuth();

    const { error } = await supabase.from("deal_activities").insert({
      deal_id: params.dealId,
      user_id: user.id,
      type: params.type,
      content: params.content,
    });

    if (error) return { error: error.message };
    return { success: true };
  } catch {
    return { error: "Non authentifié" };
  }
}

// ─── Mutations CRM ──────────────────────────────────────────────────

export async function createDeal(params: {
  title: string;
  value: number;
  stage_id: string;
  temperature: string;
  source?: string;
}) {
  try {
    const { supabase, user } = await requireAuth();

    // AI mode check — optional guard for deal creation
    try {
      const { checkCriticalAction } = await import("@/lib/actions/ai-modes");
      const aiCheck = await checkCriticalAction("Envoi de contrat");
      if (aiCheck.requiresValidation) {
        return {
          error:
            "Action bloquée : cette action nécessite une validation manuelle (mode IA critique activé)",
        };
      }
    } catch {
      // Ignore — AI mode config not set up
    }

    if (!params.value || params.value <= 0) {
      return { error: "La valeur du deal doit être supérieure à 0" };
    }

    const { data, error } = await supabase
      .from("deals")
      .insert({
        title: params.title,
        value: params.value,
        stage_id: params.stage_id,
        temperature: params.temperature,
        source: params.source || null,
        assigned_to: user.id,
      })
      .select(
        "*, contact:profiles!deals_contact_id_fkey(*), assigned_user:profiles!deals_assigned_to_fkey(*)",
      )
      .single();

    if (error) return { error: error.message };

    logAuditEvent({
      action: "create",
      entity_type: "deal",
      entity_id: data.id,
      details: { title: params.title },
    }).catch(() => {});

    revalidatePath("/crm");
    return { deal: data };
  } catch {
    return { error: "Non authentifié" };
  }
}

export async function bulkMoveDeals(dealIds: string[], stageId: string) {
  try {
    const { supabase, user } = await requireAuth();

    // Role-based permission
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profile?.role === "client_b2b" || profile?.role === "client_b2c") {
      return { error: "Accès refusé : modification non autorisée" };
    }

    if (!dealIds.length) return { error: "Aucun deal sélectionné" };

    // Validate that stageId exists
    const { data: stage } = await supabase
      .from("pipeline_stages")
      .select("id, name")
      .eq("id", stageId)
      .single();

    if (!stage) return { error: "Stage invalide" };

    const { error } = await supabase
      .from("deals")
      .update({ stage_id: stageId, updated_at: new Date().toISOString() })
      .in("id", dealIds);

    if (error) return { error: error.message };

    logAuditEvent({
      action: "update",
      entity_type: "deal",
      entity_id: dealIds.join(","),
      details: { bulk_move: true, stage_id: stageId, count: dealIds.length },
    }).catch(() => {});

    revalidatePath("/crm");
    return { success: true, count: dealIds.length };
  } catch {
    return { error: "Non authentifié" };
  }
}

export async function getContactTags() {
  try {
    const { supabase } = await requireAuth();

    // Get all distinct tags from deals
    const { data: deals } = await supabase
      .from("deals")
      .select("tags")
      .not("tags", "is", null)
      .limit(1000);

    if (!deals) return [];

    const tagSet = new Set<string>();
    deals.forEach((d) => {
      if (Array.isArray(d.tags)) {
        d.tags.forEach((t: string) => tagSet.add(t));
      }
    });

    return Array.from(tagSet).sort();
  } catch {
    return [];
  }
}

export async function updateDealStage(dealId: string, stageId: string) {
  try {
    const { supabase, user } = await requireAuth();

    // Role-based permission: B2B clients cannot mutate deals
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profile?.role === "client_b2b" || profile?.role === "client_b2c") {
      return { error: "Accès refusé : modification non autorisée" };
    }

    // Validate that stageId exists in pipeline_stages (prevent FK violation)
    const { data: stage } = await supabase
      .from("pipeline_stages")
      .select("id")
      .eq("id", stageId)
      .single();

    if (!stage) return { error: "Stage invalide" };

    // Get old stage name for notifications (non-blocking)
    const { data: deal } = await supabase
      .from("deals")
      .select("title, stage_id, assigned_to")
      .eq("id", dealId)
      .single();

    // Core operation: update the deal stage
    const { error } = await supabase
      .from("deals")
      .update({ stage_id: stageId, updated_at: new Date().toISOString() })
      .eq("id", dealId);

    if (error) return { error: error.message };

    // Everything below is non-critical — fire-and-forget
    logAuditEvent({
      action: "update",
      entity_type: "deal",
      entity_id: dealId,
      details: { stage_id: stageId },
    }).catch(() => {});

    // Notifications (wrapped in try-catch to never block the response)
    try {
      if (deal?.assigned_to) {
        const [{ data: oldStage }, { data: newStage }, { data: assignee }] =
          await Promise.all([
            supabase
              .from("pipeline_stages")
              .select("name")
              .eq("id", deal.stage_id)
              .single(),
            supabase
              .from("pipeline_stages")
              .select("name")
              .eq("id", stageId)
              .single(),
            supabase
              .from("profiles")
              .select("email, full_name")
              .eq("id", deal.assigned_to)
              .single(),
          ]);

        const oldStageName = oldStage?.name || "—";
        const newStageName = newStage?.name || "—";

        // In-app + push notification
        notify(
          deal.assigned_to,
          "Deal déplacé",
          `"${deal.title}" est passé de ${oldStageName} à ${newStageName}`,
          {
            type: "deal",
            link: `/crm/${dealId}`,
          },
        );

        // Email notification (fire-and-forget)
        if (assignee?.email && newStageName) {
          import("@/lib/actions/email")
            .then(({ sendDealStageEmail }) =>
              sendDealStageEmail({
                email: assignee.email,
                name: assignee.full_name || "",
                dealTitle: deal.title,
                oldStage: oldStageName,
                newStage: newStageName,
              }).catch(() => {}),
            )
            .catch(() => {});
        }
      }
    } catch {
      // Non-critical: notifications failed but deal was moved successfully
    }

    revalidatePath("/crm");
    return { success: true };
  } catch {
    return { error: "Non authentifié" };
  }
}

export async function updateDealTemperature(
  dealId: string,
  temperature: string,
) {
  try {
    const { supabase, user } = await requireAuth();

    // Role-based permission
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profile?.role === "client_b2b" || profile?.role === "client_b2c") {
      return { error: "Accès refusé : modification non autorisée" };
    }

    // Validate temperature value
    if (!["hot", "warm", "cold"].includes(temperature)) {
      return { error: "Température invalide" };
    }

    const { error } = await supabase
      .from("deals")
      .update({ temperature, updated_at: new Date().toISOString() })
      .eq("id", dealId);

    if (error) return { error: error.message };

    revalidatePath("/crm");
    return { success: true };
  } catch {
    return { error: "Non authentifié" };
  }
}

export async function updateDealNotes(dealId: string, notes: string) {
  try {
    const { supabase, user } = await requireAuth();

    // Role-based permission
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profile?.role === "client_b2b" || profile?.role === "client_b2c") {
      return { error: "Accès refusé : modification non autorisée" };
    }

    const { error } = await supabase
      .from("deals")
      .update({ notes, updated_at: new Date().toISOString() })
      .eq("id", dealId);

    if (error) return { error: error.message };

    revalidatePath("/crm");
    revalidatePath(`/crm/${dealId}`);
    return { success: true };
  } catch {
    return { error: "Non authentifié" };
  }
}

export async function updateDeal(
  dealId: string,
  data: {
    title?: string;
    value?: number;
    probability?: number;
    source?: string;
    next_action?: string;
    next_action_date?: string;
    assigned_to?: string;
  },
) {
  try {
    const { supabase, user } = await requireAuth();

    // Role-based permission
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profile?.role === "client_b2b" || profile?.role === "client_b2c") {
      return { error: "Accès refusé : modification non autorisée" };
    }

    // Validate probability range
    if (data.probability !== undefined && (data.probability < 0 || data.probability > 100)) {
      return { error: "La probabilité doit être entre 0 et 100" };
    }

    const { error } = await supabase
      .from("deals")
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq("id", dealId);

    if (error) return { error: error.message };

    revalidatePath("/crm");
    revalidatePath(`/crm/${dealId}`);
    return { success: true };
  } catch {
    return { error: "Non authentifié" };
  }
}

export async function addDealActivity(
  dealId: string,
  type: string,
  content: string,
) {
  try {
    const { supabase, user } = await requireAuth();

    const { error } = await supabase.from("deal_activities").insert({
      deal_id: dealId,
      user_id: user.id,
      type,
      content,
    });

    if (error) return { error: error.message };

    // Update last_contact_at on the deal
    await supabase
      .from("deals")
      .update({ last_contact_at: new Date().toISOString() })
      .eq("id", dealId);

    revalidatePath(`/crm/${dealId}`);
    return { success: true };
  } catch {
    return { error: "Non authentifié" };
  }
}

export async function deleteDeal(dealId: string) {
  try {
    const { supabase, user } = await requireAuth();

    // Role-based permission: only admin/manager can delete
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (!profile || !["admin", "manager"].includes(profile.role)) {
      return { error: "Accès refusé : seuls les admins et managers peuvent supprimer un deal" };
    }

    // Unlink contracts from this deal (prevent orphans)
    await supabase
      .from("contracts")
      .update({ deal_id: null })
      .eq("deal_id", dealId);

    // Delete activities first
    await supabase.from("deal_activities").delete().eq("deal_id", dealId);

    const { error } = await supabase.from("deals").delete().eq("id", dealId);

    if (error) return { error: error.message };

    logAuditEvent({
      action: "delete",
      entity_type: "deal",
      entity_id: dealId,
    }).catch(() => {});

    revalidatePath("/crm");
    return { success: true };
  } catch {
    return { error: "Non authentifié" };
  }
}

export async function createDealFromBooking(params: {
  prospectName: string;
  prospectEmail?: string;
  slotType: string;
}) {
  try {
    const { supabase, user } = await requireAuth();

    // Get the first pipeline stage (Prospect)
    const { data: firstStage } = await supabase
      .from("pipeline_stages")
      .select("id")
      .order("position", { ascending: true })
      .limit(1)
      .single();

    if (!firstStage) return { error: "Aucun stage pipeline configuré" };

    const title = `${params.prospectName} — ${params.slotType === "discovery" ? "Découverte" : params.slotType === "closing" ? "Closing" : "Suivi"}`;

    const { data, error } = await supabase
      .from("deals")
      .insert({
        title,
        value: 0,
        stage_id: firstStage.id,
        temperature: "warm",
        source: "booking",
        assigned_to: user.id,
      })
      .select(
        "*, contact:profiles!deals_contact_id_fkey(*), assigned_user:profiles!deals_assigned_to_fkey(*)",
      )
      .single();

    if (error) return { error: error.message };

    revalidatePath("/crm");
    return { deal: data };
  } catch {
    return { error: "Non authentifié" };
  }
}

// ─── F35: Automated Follow-ups ─────────────────────────────────────

/**
 * Get deals where last_contact_at is older than `daysThreshold` days.
 * Returns contacts needing follow-up with their details.
 */
export async function getOverdueFollowUps(daysThreshold = 2) {
  try {
    const { supabase } = await requireAuth();

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysThreshold);

    const { data, error } = await supabase
      .from("deals")
      .select(
        "id, title, value, temperature, last_contact_at, stage_id, contact:profiles!deals_contact_id_fkey(id, full_name, email, phone), assigned_user:profiles!deals_assigned_to_fkey(id, full_name)",
      )
      .lt("last_contact_at", cutoffDate.toISOString())
      .not("last_contact_at", "is", null)
      .order("last_contact_at", { ascending: true })
      .limit(500);

    if (error) return { error: error.message, data: [] };

    const overdueDeals = (data || []).map((deal) => {
      const lastContact = new Date(deal.last_contact_at as string);
      const now = new Date();
      const daysOverdue = Math.floor(
        (now.getTime() - lastContact.getTime()) / (1000 * 60 * 60 * 24),
      );
      return { ...deal, daysOverdue };
    });

    return { error: null, data: overdueDeals };
  } catch {
    return { error: "Non authentifié", data: [] };
  }
}

/**
 * Create an automated follow-up task (deal activity) for a given deal.
 */
export async function createAutoFollowUp(dealId: string, daysOverdue: number) {
  try {
    const { supabase, user } = await requireAuth();

    const { data: deal } = await supabase
      .from("deals")
      .select("title, assigned_to, contact_id")
      .eq("id", dealId)
      .single();

    if (!deal) return { error: "Deal introuvable" };

    // --- AI-powered message generation + real sending ---
    let messageSent = false;
    let channelUsed = "";
    let aiMessage = "";

    if (deal.contact_id) {
      try {
        const { data: contact } = await supabase
          .from("profiles")
          .select("full_name, email, phone")
          .eq("id", deal.contact_id)
          .single();

        if (contact) {
          // Determine best channel: WhatsApp if phone, else email
          const { generateFollowUpMessage, sendMessageToContact } =
            await import("@/lib/actions/messaging");

          const channel = contact.phone ? "whatsapp" : "email";

          // Generate AI message
          const aiResult = await generateFollowUpMessage({
            contactName: contact.full_name || "prospect",
            dealTitle: deal.title,
            daysOverdue,
            channel,
          });

          if (aiResult.message) {
            aiMessage = aiResult.message;

            // Parse subject for email channel
            let subject: string | undefined;
            let body = aiMessage;
            if (channel === "email" && aiMessage.startsWith("Objet:")) {
              const lines = aiMessage.split("\n");
              subject = lines[0].replace("Objet:", "").trim();
              body = lines.slice(1).join("\n").trim();
            }

            // Send the message
            const sendResult = await sendMessageToContact({
              contactId: deal.contact_id,
              channel,
              subject,
              message: body,
            });

            if (sendResult.success) {
              messageSent = true;
              channelUsed = channel;
            }
          }
        }
      } catch (err) {
        // Non-critical: AI/sending failed, continue with notification-only follow-up
        console.error(
          "[AutoFollowUp] AI/send error:",
          err instanceof Error ? err.message : err,
        );
      }
    }

    // Create a follow-up activity on the deal
    const activityContent = messageSent
      ? `Relance automatique IA envoyée via ${channelUsed} — ${daysOverdue} jour(s) sans contact.`
      : `Relance automatique — ${daysOverdue} jour(s) sans contact. Action requise.`;

    const { error: activityError } = await supabase
      .from("deal_activities")
      .insert({
        deal_id: dealId,
        user_id: user.id,
        type: "auto_follow_up",
        content: activityContent,
      });

    if (activityError) return { error: activityError.message };

    // Create an in-app notification for the assigned user
    const notifyUserId = deal.assigned_to || user.id;
    const notifBody = messageSent
      ? `Relance IA envoyée via ${channelUsed} pour le deal "${deal.title}" (${daysOverdue}j sans contact).`
      : `Le deal "${deal.title}" n'a pas eu de contact depuis ${daysOverdue} jour(s).`;

    notify(
      notifyUserId,
      messageSent ? "Relance IA envoyée" : "Relance automatique",
      notifBody,
      {
        type: "follow_up",
        link: `/crm/${dealId}`,
      },
    );

    // Update next_action on the deal
    await supabase
      .from("deals")
      .update({
        next_action: messageSent ? "Relance IA envoyée" : "Relance automatique",
        next_action_date: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", dealId);

    revalidatePath("/crm");
    return { success: true, messageSent, channel: channelUsed };
  } catch {
    return { error: "Non authentifié" };
  }
}

/**
 * Find all overdue contacts (2+ days without response) and create
 * follow-up entries for them. Returns the count of follow-ups created.
 */
export async function triggerAutomatedFollowUps(daysThreshold = 2) {
  try {
    const { supabase } = await requireAuth();

    const { error: fetchError, data: overdueDeals } =
      await getOverdueFollowUps(daysThreshold);

    if (fetchError || !overdueDeals) return { error: fetchError, count: 0 };

    let created = 0;

    for (const deal of overdueDeals) {
      // Skip deals that already have a recent auto follow-up (last 24h)
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);

      const { data: recentActivity } = await supabase
        .from("deal_activities")
        .select("id")
        .eq("deal_id", deal.id)
        .eq("type", "auto_follow_up")
        .gte("created_at", oneDayAgo.toISOString())
        .limit(1)
        .maybeSingle();

      if (recentActivity) continue; // Already followed up recently

      const result = await createAutoFollowUp(deal.id, deal.daysOverdue);
      if (result.success) created++;
    }

    revalidatePath("/crm");
    revalidatePath("/prospecting/follow-ups");
    return { error: null, count: created };
  } catch {
    return { error: "Non authentifié", count: 0 };
  }
}
