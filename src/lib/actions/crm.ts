"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// ─── Queries ────────────────────────────────────────────────────────

export async function getDealById(dealId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { deal: null, error: "Non authentifié" };

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
}

export async function getDealActivities(dealId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("deal_activities")
    .select("*, user:profiles(*)")
    .eq("deal_id", dealId)
    .order("created_at", { ascending: false })
    .limit(50);

  return data || [];
}

export async function getPipelineStages() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("pipeline_stages")
    .select("*")
    .order("position", { ascending: true });
  return data || [];
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

export async function getFilteredDeals(filters: DealFilters) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { deals: [], error: "Non authentifié" };

  let query = supabase
    .from("deals")
    .select(
      "*, contact:profiles!deals_contact_id_fkey(*), assigned_user:profiles!deals_assigned_to_fkey(*)",
    );

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
}

export async function getDealSources() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("deals")
    .select("source")
    .not("source", "is", null);

  const sources = [
    ...new Set((data || []).map((d) => d.source).filter(Boolean)),
  ] as string[];
  return sources;
}

export async function getTeamMembers() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .in("role", ["setter", "closer", "manager", "admin"]);

  return data || [];
}

export async function getRecentDeals(limit = 10) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("deals")
    .select("id, title, value, stage_id, contact:contacts(full_name)")
    .order("updated_at", { ascending: false })
    .limit(limit);
  return data || [];
}

export async function searchDeals(query: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("deals")
    .select("id, title, value, stage_id, contact:contacts(full_name)")
    .ilike("title", `%${query}%`)
    .limit(20);
  return data || [];
}

export async function addQuickNote(params: {
  dealId: string;
  content: string;
  type: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const { error } = await supabase.from("deal_activities").insert({
    deal_id: params.dealId,
    user_id: user.id,
    type: params.type,
    content: params.content,
  });

  if (error) return { error: error.message };
  return { success: true };
}

// ─── Mutations CRM ──────────────────────────────────────────────────

export async function createDeal(params: {
  title: string;
  value: number;
  stage_id: string;
  temperature: string;
  source?: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const { data, error } = await supabase
    .from("deals")
    .insert({
      title: params.title,
      value: params.value,
      stage_id: params.stage_id,
      temperature: params.temperature,
      source: params.source || null,
    })
    .select(
      "*, contact:profiles!deals_contact_id_fkey(*), assigned_user:profiles!deals_assigned_to_fkey(*)",
    )
    .single();

  if (error) return { error: error.message };

  revalidatePath("/crm");
  return { deal: data };
}

export async function updateDealStage(dealId: string, stageId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  // Get old stage name for email notification
  const { data: deal } = await supabase
    .from("deals")
    .select("title, stage_id, assigned_to, pipeline_stages(name)")
    .eq("id", dealId)
    .single();

  const { error } = await supabase
    .from("deals")
    .update({ stage_id: stageId, updated_at: new Date().toISOString() })
    .eq("id", dealId);

  if (error) return { error: error.message };

  // Send email notification (fire-and-forget)
  if (deal?.assigned_to) {
    const { data: newStage } = await supabase
      .from("pipeline_stages")
      .select("name")
      .eq("id", stageId)
      .single();
    const { data: assignee } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", deal.assigned_to)
      .single();

    if (assignee?.email && newStage?.name) {
      const stageData = deal.pipeline_stages;
      const oldStageName = (Array.isArray(stageData) ? stageData[0]?.name : (stageData as { name: string } | null)?.name) || "—";
      import("@/lib/actions/email").then(({ sendDealStageEmail }) =>
        sendDealStageEmail({
          email: assignee.email,
          name: assignee.full_name || "",
          dealTitle: deal.title,
          oldStage: oldStageName,
          newStage: newStage.name,
        }).catch(() => {})
      );
    }
  }

  revalidatePath("/crm");
  return { success: true };
}

export async function updateDealTemperature(
  dealId: string,
  temperature: string,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const { error } = await supabase
    .from("deals")
    .update({ temperature, updated_at: new Date().toISOString() })
    .eq("id", dealId);

  if (error) return { error: error.message };

  revalidatePath("/crm");
  return { success: true };
}

export async function updateDealNotes(dealId: string, notes: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const { error } = await supabase
    .from("deals")
    .update({ notes, updated_at: new Date().toISOString() })
    .eq("id", dealId);

  if (error) return { error: error.message };

  revalidatePath("/crm");
  revalidatePath(`/crm/${dealId}`);
  return { success: true };
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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const { error } = await supabase
    .from("deals")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", dealId);

  if (error) return { error: error.message };

  revalidatePath("/crm");
  revalidatePath(`/crm/${dealId}`);
  return { success: true };
}

export async function addDealActivity(
  dealId: string,
  type: string,
  content: string,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

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
}

export async function deleteDeal(dealId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  // Delete activities first
  await supabase.from("deal_activities").delete().eq("deal_id", dealId);

  const { error } = await supabase.from("deals").delete().eq("id", dealId);

  if (error) return { error: error.message };

  revalidatePath("/crm");
  return { success: true };
}
