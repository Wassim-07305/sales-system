"use server";

import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export interface ProspectSegmentFilters {
  platform?: string;
  status?: string;
  listId?: string;
  temperature?: string;
  scoreMin?: number;
  scoreMax?: number;
  recency?: "recent" | "inactive" | "all";
}

export async function getProspects(filters?: ProspectSegmentFilters) {
  const { supabase } = await requireAuth();
  let query = supabase
    .from("prospects")
    .select("*, list:prospect_lists(id, name)")
    .order("created_at", { ascending: false });

  if (filters?.platform) query = query.eq("platform", filters.platform);
  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.listId) query = query.eq("list_id", filters.listId);

  // Recency filter
  if (filters?.recency === "recent") {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    query = query.gte("last_message_at", sevenDaysAgo.toISOString());
  } else if (filters?.recency === "inactive") {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    query = query.or(
      `last_message_at.lt.${thirtyDaysAgo.toISOString()},last_message_at.is.null`,
    );
  }

  const { data } = await query;
  const prospects = (data || []).map((d: Record<string, unknown>) => ({
    ...d,
    list: Array.isArray(d.list) ? d.list[0] || null : d.list,
  }));

  // If we need to filter by score or temperature, fetch scores and filter in-memory
  if (
    filters?.temperature ||
    filters?.scoreMin !== undefined ||
    filters?.scoreMax !== undefined
  ) {
    const prospectIds = prospects.map(
      (p: Record<string, unknown>) => p.id as string,
    );
    if (prospectIds.length === 0) return prospects;

    let scoreQuery = supabase
      .from("prospect_scores")
      .select("prospect_id, total_score, temperature")
      .in("prospect_id", prospectIds);

    if (filters.temperature) {
      scoreQuery = scoreQuery.eq("temperature", filters.temperature);
    }
    if (filters.scoreMin !== undefined) {
      scoreQuery = scoreQuery.gte("total_score", filters.scoreMin);
    }
    if (filters.scoreMax !== undefined) {
      scoreQuery = scoreQuery.lte("total_score", filters.scoreMax);
    }

    const { data: scores } = await scoreQuery;
    const matchingIds = new Set(
      (scores || []).map(
        (s: Record<string, unknown>) => s.prospect_id as string,
      ),
    );
    return prospects.filter((p: Record<string, unknown>) =>
      matchingIds.has(p.id as string),
    );
  }

  return prospects;
}

export async function getProspectSegmentStats() {
  const { supabase } = await requireAuth();

  const { data: allProspects } = await supabase
    .from("prospects")
    .select("id")
    .limit(5000);
  const totalCount = allProspects?.length || 0;

  const { data: scores } = await supabase
    .from("prospect_scores")
    .select("prospect_id, total_score, temperature")
    .limit(5000);

  let hotCount = 0;
  let warmCount = 0;
  let coldCount = 0;
  let totalScore = 0;
  const scoreCount = scores?.length || 0;

  for (const s of scores || []) {
    const temp = s.temperature as string;
    if (temp === "hot") hotCount++;
    else if (temp === "warm") warmCount++;
    else coldCount++;
    totalScore += (s.total_score as number) || 0;
  }

  return {
    total: totalCount,
    hot: hotCount,
    warm: warmCount,
    cold: coldCount,
    avgScore: scoreCount > 0 ? Math.round(totalScore / scoreCount) : 0,
  };
}

export async function addProspect(formData: {
  name: string;
  profile_url?: string;
  platform: string;
  list_id?: string;
}) {
  try {
    const { supabase, user, profile } = await requireAuth();

    const blockedRoles = ["client_b2b", "client_b2c"];
    if (blockedRoles.includes(profile.role)) {
      return { error: "Accès refusé" };
    }

    const { error } = await supabase.from("prospects").insert({
      name: formData.name,
      profile_url: formData.profile_url || null,
      platform: formData.platform,
      list_id: formData.list_id || null,
      status: "new",
      created_by: user.id,
    });
    if (error) return { error: "Impossible d'ajouter le prospect." };
    revalidatePath("/prospecting");
    return { success: true };
  } catch {
    return { error: "Non authentifié" };
  }
}

export async function updateProspectStatus(prospectId: string, status: string) {
  try {
    const { supabase, profile } = await requireAuth();

    const blockedRoles = ["client_b2b", "client_b2c"];
    if (blockedRoles.includes(profile.role)) {
      return { error: "Accès refusé" };
    }

    const validStatuses = [
      "new",
      "contacted",
      "replied",
      "hot",
      "interested",
      "qualified",
      "booked",
      "converted",
      "lost",
      "not_interested",
    ];
    if (!validStatuses.includes(status)) return { error: "Statut invalide" };

    const { error } = await supabase
      .from("prospects")
      .update({ status })
      .eq("id", prospectId);
    if (error) return { error: "Impossible de mettre à jour le statut." };
    revalidatePath("/prospecting");
    return { success: true };
  } catch {
    return { error: "Non authentifié" };
  }
}

export async function getDailyQuota() {
  try {
    const { supabase, user } = await requireAuth();

    const today = new Date().toISOString().split("T")[0];
    const { data } = await supabase
      .from("daily_quotas")
      .select("*")
      .eq("user_id", user.id)
      .eq("date", today)
      .single();

    if (data) return data;

    // Create today's quota
    const { data: newQuota } = await supabase
      .from("daily_quotas")
      .insert({
        user_id: user.id,
        date: today,
        dms_sent: 0,
        dms_target: 20,
        replies_received: 0,
        bookings_from_dms: 0,
      })
      .select()
      .single();
    return newQuota;
  } catch {
    return null;
  }
}

export async function incrementDmsSent() {
  try {
    const { supabase, user } = await requireAuth();

    const today = new Date().toISOString().split("T")[0];
    const { data: quota } = await supabase
      .from("daily_quotas")
      .select("id, dms_sent")
      .eq("user_id", user.id)
      .eq("date", today)
      .single();

    if (quota) {
      await supabase
        .from("daily_quotas")
        .update({ dms_sent: quota.dms_sent + 1 })
        .eq("id", quota.id);
    } else {
      await supabase.from("daily_quotas").insert({
        user_id: user.id,
        date: today,
        dms_sent: 1,
        dms_target: 20,
        replies_received: 0,
        bookings_from_dms: 0,
      });
    }
    revalidatePath("/prospecting");
  } catch {
    // Non authentifié — silently ignore
  }
}

export async function incrementReplies() {
  try {
    const { supabase, user } = await requireAuth();

    const today = new Date().toISOString().split("T")[0];
    const { data: quota } = await supabase
      .from("daily_quotas")
      .select("id, replies_received")
      .eq("user_id", user.id)
      .eq("date", today)
      .single();
    if (quota) {
      await supabase
        .from("daily_quotas")
        .update({ replies_received: quota.replies_received + 1 })
        .eq("id", quota.id);
    } else {
      await supabase.from("daily_quotas").insert({
        user_id: user.id,
        date: today,
        dms_sent: 0,
        dms_target: 20,
        replies_received: 1,
        bookings_from_dms: 0,
      });
    }
    revalidatePath("/prospecting");
  } catch {
    // Non authentifié — silently ignore
  }
}

export async function getProspectLists() {
  const { supabase } = await requireAuth();
  const { data } = await supabase
    .from("prospect_lists")
    .select("*")
    .order("created_at", { ascending: false });
  return data || [];
}

export async function getTemplates() {
  const { supabase } = await requireAuth();
  const { data } = await supabase
    .from("dm_templates")
    .select("*")
    .order("step")
    .order("variant");
  return data || [];
}

export async function createTemplate(formData: {
  name: string;
  platform: string;
  step: string;
  niche?: string;
  content: string;
  variant: string;
}) {
  try {
    const { supabase, profile } = await requireAuth();

    const blockedRoles = ["client_b2b", "client_b2c"];
    if (blockedRoles.includes(profile.role)) {
      return { error: "Accès refusé" };
    }

    const { error } = await supabase.from("dm_templates").insert(formData);
    if (error) return { error: "Impossible de créer le template." };
    revalidatePath("/prospecting/campaigns");
    return { success: true };
  } catch {
    return { error: "Non authentifié" };
  }
}

export async function updateTemplate(
  id: string,
  formData: {
    name?: string;
    platform?: string;
    step?: string;
    niche?: string;
    content?: string;
    variant?: string;
  },
) {
  try {
    const { supabase, profile } = await requireAuth();

    const blockedRoles = ["client_b2b", "client_b2c"];
    if (blockedRoles.includes(profile.role)) {
      return { error: "Accès refusé" };
    }

    const { error } = await supabase
      .from("dm_templates")
      .update(formData)
      .eq("id", id);
    if (error) return { error: "Impossible de mettre à jour le template." };
    revalidatePath("/prospecting/campaigns");
    return { success: true };
  } catch {
    return { error: "Non authentifié" };
  }
}

export async function deleteTemplate(id: string) {
  try {
    const { supabase, profile } = await requireAuth();

    const blockedRoles = ["client_b2b", "client_b2c"];
    if (blockedRoles.includes(profile.role)) {
      return { error: "Accès refusé" };
    }

    const { error } = await supabase.from("dm_templates").delete().eq("id", id);
    if (error) return { error: "Impossible de supprimer le template." };
    revalidatePath("/prospecting/campaigns");
    return { success: true };
  } catch {
    return { error: "Non authentifié" };
  }
}

export async function deleteProspect(id: string) {
  try {
    const { supabase, profile } = await requireAuth();

    const allowedRoles = ["admin", "manager"];
    if (!allowedRoles.includes(profile.role)) {
      return { error: "Accès refusé — seuls les admins et managers peuvent supprimer" };
    }

    // Cascade: delete prospect scores first
    await supabase.from("prospect_scores").delete().eq("prospect_id", id);

    const { error } = await supabase.from("prospects").delete().eq("id", id);
    if (error) return { error: "Impossible de supprimer le prospect." };
    revalidatePath("/prospecting");
    return { success: true };
  } catch {
    return { error: "Non authentifié" };
  }
}

// ─── Detail Page Actions ────────────────────────────────────────────

export async function getProspectById(prospectId: string) {
  try {
    const { supabase } = await requireAuth();

    const { data, error } = await supabase
      .from("prospects")
      .select(
        "*, list:prospect_lists(*), assigned_setter:profiles!prospects_assigned_setter_id_fkey(id, full_name, avatar_url)",
      )
      .eq("id", prospectId)
      .single();

    if (error) return { prospect: null, error: error.message };

    // Normalize joined data
    const prospect = {
      ...data,
      list: Array.isArray(data.list) ? data.list[0] || null : data.list,
      assigned_setter: Array.isArray(data.assigned_setter)
        ? data.assigned_setter[0] || null
        : data.assigned_setter,
    };

    return { prospect, error: null };
  } catch {
    return { prospect: null, error: "Non authentifié" };
  }
}

export async function getProspectScore(prospectId: string) {
  const { supabase } = await requireAuth();
  const { data } = await supabase
    .from("prospect_scores")
    .select("*")
    .eq("prospect_id", prospectId)
    .single();
  return data;
}

export async function updateProspect(
  prospectId: string,
  data: {
    name?: string;
    profile_url?: string;
    platform?: string;
    status?: string;
    notes?: string;
    list_id?: string;
    assigned_setter_id?: string;
    auto_follow_up?: boolean;
  },
) {
  try {
    const { supabase, profile } = await requireAuth();

    const blockedRoles = ["client_b2b", "client_b2c"];
    if (blockedRoles.includes(profile.role)) {
      return { error: "Accès refusé" };
    }

    const { error } = await supabase
      .from("prospects")
      .update(data)
      .eq("id", prospectId);

    if (error) return { error: error.message };

    revalidatePath("/prospecting");
    revalidatePath(`/prospecting/${prospectId}`);
    return { success: true };
  } catch {
    return { error: "Non authentifié" };
  }
}

export async function addProspectMessage(
  prospectId: string,
  message: string,
  direction: "sent" | "received",
) {
  try {
    const { supabase, user } = await requireAuth();

    // Get current conversation history
    const { data: prospect } = await supabase
      .from("prospects")
      .select("conversation_history")
      .eq("id", prospectId)
      .single();

    const history = Array.isArray(prospect?.conversation_history)
      ? prospect.conversation_history
      : [];

    const newMessage = {
      id: crypto.randomUUID(),
      content: message,
      direction,
      timestamp: new Date().toISOString(),
      user_id: user.id,
    };

    const { error } = await supabase
      .from("prospects")
      .update({
        conversation_history: [...history, newMessage],
        last_message_at: new Date().toISOString(),
      })
      .eq("id", prospectId);

    if (error) return { error: error.message };

    // Update daily quota if sent
    if (direction === "sent") {
      await incrementDmsSent();
    } else {
      await incrementReplies();

      // Notify the assigned setter when a prospect replies
      try {
        const { data: prospectInfo } = await supabase
          .from("prospects")
          .select("name, assigned_setter_id")
          .eq("id", prospectId)
          .single();

        if (prospectInfo?.assigned_setter_id && prospectInfo.assigned_setter_id !== user.id) {
          const { notify } = await import("@/lib/actions/notifications");
          await notify(
            prospectInfo.assigned_setter_id,
            `${prospectInfo.name} a répondu`,
            message.slice(0, 120),
            { link: `/prospecting/${prospectId}`, type: "prospect_reply" },
          );
        }
      } catch {
        // Non-critical
      }
    }

    revalidatePath(`/prospecting/${prospectId}`);
    return { success: true };
  } catch {
    return { error: "Non authentifié" };
  }
}

export async function convertProspectToDeal(
  prospectId: string,
  dealData: {
    title: string;
    value: number;
    stage_id: string;
  },
) {
  try {
    const { supabase, profile } = await requireAuth();

    const blockedRoles = ["client_b2b", "client_b2c"];
    if (blockedRoles.includes(profile.role)) {
      return { error: "Accès refusé" };
    }

    // Get prospect data
    const { data: prospect } = await supabase
      .from("prospects")
      .select("name, profile_url")
      .eq("id", prospectId)
      .single();

    if (!prospect) return { error: "Prospect introuvable" };

    // Create deal
    const { data: deal, error: dealError } = await supabase
      .from("deals")
      .insert({
        title: dealData.title,
        value: dealData.value,
        stage_id: dealData.stage_id,
        source: "prospecting",
        temperature: "warm",
        notes: `Converti depuis prospect: ${prospect.name}`,
      })
      .select()
      .single();

    if (dealError) return { error: dealError.message };

    // Update prospect status
    await supabase
      .from("prospects")
      .update({ status: "booked" })
      .eq("id", prospectId);

    revalidatePath("/prospecting");
    revalidatePath("/crm");
    return { success: true, dealId: deal.id };
  } catch {
    return { error: "Non authentifié" };
  }
}

export async function qualifyProspect(
  prospectId: string,
  params: {
    createDeal: boolean;
    temperature: string;
  },
) {
  try {
    const { supabase, profile } = await requireAuth();

    const blockedRoles = ["client_b2b", "client_b2c"];
    if (blockedRoles.includes(profile.role)) {
      return { error: "Accès refusé" };
    }

    // Get prospect data
    const { data: prospect } = await supabase
      .from("prospects")
      .select("name, profile_url, platform")
      .eq("id", prospectId)
      .single();

    if (!prospect) return { error: "Prospect introuvable" };

    // Update prospect status to qualified
    const { error: statusError } = await supabase
      .from("prospects")
      .update({ status: "qualified" })
      .eq("id", prospectId);

    if (statusError) return { error: "Impossible de qualifier le prospect" };

    let dealCreated = false;

    // Optionally create a deal
    if (params.createDeal) {
      // Get the first pipeline stage
      const { data: firstStage } = await supabase
        .from("pipeline_stages")
        .select("id")
        .order("position", { ascending: true })
        .limit(1)
        .single();

      if (firstStage) {
        const { error: dealError } = await supabase
          .from("deals")
          .insert({
            title: `${prospect.name} — Qualification scoring`,
            value: 0,
            stage_id: firstStage.id,
            source: "scoring",
            temperature: params.temperature,
            notes: `Qualifié automatiquement depuis le scoring (${prospect.platform})`,
          })
          .select()
          .single();

        dealCreated = !dealError;
      }
    }

    revalidatePath("/prospecting");
    revalidatePath("/crm");
    return { success: true, dealCreated };
  } catch {
    return { error: "Non authentifié" };
  }
}

// ─── CSV Import / Export ────────────────────────────────────────────

export async function importProspectsCSV(
  csvText: string,
  listId?: string,
) {
  const errors: string[] = [];
  let imported = 0;

  try {
    const { supabase, user, profile } = await requireAuth();

    const blockedRoles = ["client_b2b", "client_b2c"];
    if (blockedRoles.includes(profile.role)) {
      return { imported: 0, errors: ["Accès refusé"] };
    }

    const lines = csvText.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length < 2) {
      return { imported: 0, errors: ["Le fichier CSV est vide ou ne contient pas d'en-tête."] };
    }

    const header = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/"/g, ""));
    const nameIdx = header.findIndex((h) => h === "name" || h === "nom");
    const platformIdx = header.findIndex((h) => h === "platform" || h === "plateforme");
    const urlIdx = header.findIndex((h) => h === "profile_url" || h === "url" || h === "lien");
    const notesIdx = header.findIndex((h) => h === "notes" || h === "note");

    if (nameIdx === -1) {
      return { imported: 0, errors: ["Colonne 'name' ou 'nom' requise dans l'en-tête CSV."] };
    }

    const rows = lines.slice(1);
    const batchSize = 50;

    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const inserts: {
        name: string;
        platform: string;
        profile_url: string | null;
        notes: string | null;
        list_id: string | null;
        status: string;
        created_by: string;
      }[] = [];

      for (let j = 0; j < batch.length; j++) {
        const lineNum = i + j + 2;
        const cols = batch[j].split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
        const name = cols[nameIdx]?.trim();

        if (!name) {
          errors.push(`Ligne ${lineNum}: nom manquant`);
          continue;
        }

        inserts.push({
          name,
          platform: (platformIdx >= 0 ? cols[platformIdx] : null) || "linkedin",
          profile_url: urlIdx >= 0 ? cols[urlIdx] || null : null,
          notes: notesIdx >= 0 ? cols[notesIdx] || null : null,
          list_id: listId || null,
          status: "new",
          created_by: user.id,
        });
      }

      if (inserts.length > 0) {
        const { error } = await supabase.from("prospects").insert(inserts);
        if (error) {
          errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${error.message}`);
        } else {
          imported += inserts.length;
        }
      }
    }

    revalidatePath("/prospecting");
    return { imported, errors };
  } catch {
    return { imported, errors: [...errors, "Non authentifié"] };
  }
}

export async function exportProspectsCSV() {
  try {
    const { supabase } = await requireAuth();

    const { data: prospects } = await supabase
      .from("prospects")
      .select("name, platform, profile_url, status, notes, created_at")
      .order("created_at", { ascending: false });

    if (!prospects || prospects.length === 0) return null;

    const header = "nom,plateforme,url,statut,notes,date_creation";
    const rows = prospects.map((p) =>
      [
        `"${(p.name || "").replace(/"/g, '""')}"`,
        p.platform || "",
        p.profile_url || "",
        p.status || "",
        `"${(p.notes || "").replace(/"/g, '""')}"`,
        p.created_at?.split("T")[0] || "",
      ].join(","),
    );

    return [header, ...rows].join("\n");
  } catch {
    return null;
  }
}

// ─── Reminders (Follow-up Tasks) ────────────────────────────────────

export async function createProspectReminder(
  prospectId: string,
  data: { scheduledAt: string; message: string },
) {
  try {
    const { supabase, user, profile } = await requireAuth();

    const blockedRoles = ["client_b2b", "client_b2c"];
    if (blockedRoles.includes(profile.role)) {
      return { error: "Accès refusé" };
    }

    const { error } = await supabase.from("follow_up_tasks").insert({
      prospect_id: prospectId,
      message_content: data.message,
      scheduled_at: data.scheduledAt,
      completed: false,
      created_by: user.id,
    });

    if (error) return { error: "Impossible de créer le rappel." };

    revalidatePath(`/prospecting/${prospectId}`);
    revalidatePath("/dashboard");
    return { success: true };
  } catch {
    return { error: "Non authentifié" };
  }
}

export async function completeProspectReminder(taskId: string) {
  try {
    const { supabase, profile } = await requireAuth();

    const blockedRoles = ["client_b2b", "client_b2c"];
    if (blockedRoles.includes(profile.role)) {
      return { error: "Accès refusé" };
    }

    const { error } = await supabase
      .from("follow_up_tasks")
      .update({ completed: true, completed_at: new Date().toISOString() })
      .eq("id", taskId);

    if (error) return { error: "Impossible de compléter le rappel." };

    revalidatePath("/prospecting");
    revalidatePath("/dashboard");
    return { success: true };
  } catch {
    return { error: "Non authentifié" };
  }
}

export async function getProspectReminders(prospectId: string) {
  try {
    const { supabase } = await requireAuth();

    const { data } = await supabase
      .from("follow_up_tasks")
      .select("id, message_content, scheduled_at, completed, completed_at")
      .eq("prospect_id", prospectId)
      .order("scheduled_at", { ascending: true });

    return data || [];
  } catch {
    return [];
  }
}

export async function getSettersForAssignment() {
  const { supabase } = await requireAuth();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url")
    .in("role", ["setter", "closer", "manager", "admin"]);
  return data || [];
}

