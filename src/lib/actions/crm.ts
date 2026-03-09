"use server";

import { createClient } from "@/lib/supabase/server";

export interface DealFilters {
  dateFrom?: string;
  dateTo?: string;
  amountMin?: number;
  amountMax?: number;
  assignedTo?: string;
  source?: string;
  sortBy?: "value_asc" | "value_desc" | "created_at_asc" | "created_at_desc" | "title_asc" | "title_desc";
}

export async function getFilteredDeals(filters: DealFilters) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { deals: [], error: "Non authentifié" };

  let query = supabase
    .from("deals")
    .select("*, contact:profiles!deals_contact_id_fkey(*), assigned_user:profiles!deals_assigned_to_fkey(*)");

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
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("deals")
    .select("source")
    .not("source", "is", null);

  const sources = [...new Set((data || []).map((d) => d.source).filter(Boolean))] as string[];
  return sources;
}

export async function getTeamMembers() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .in("role", ["setter", "closer", "manager", "admin"]);

  return data || [];
}

/**
 * Add a quick note to a deal (creates a deal_activity entry).
 */
export async function addQuickNote(params: {
  dealId: string;
  content: string;
  type?: "note" | "call" | "email" | "meeting" | "task";
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non authentifié" };

  const { error } = await supabase.from("deal_activities").insert({
    deal_id: params.dealId,
    user_id: user.id,
    type: params.type || "note",
    content: params.content.trim(),
    created_at: new Date().toISOString(),
  });

  if (error) {
    return { success: false, error: error.message };
  }

  // Update deal's last_contact_at
  await supabase
    .from("deals")
    .update({
      last_contact_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.dealId);

  return { success: true };
}

/**
 * Get recent deals for quick note selector.
 */
export async function getRecentDeals(limit = 10) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("deals")
    .select("id, title, value, contact:profiles!deals_contact_id_fkey(full_name)")
    .order("updated_at", { ascending: false })
    .limit(limit);

  return data || [];
}

/**
 * Search deals by title for quick note selector.
 */
export async function searchDeals(query: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("deals")
    .select("id, title, value, contact:profiles!deals_contact_id_fkey(full_name)")
    .ilike("title", `%${query}%`)
    .order("updated_at", { ascending: false })
    .limit(10);

  return data || [];
}
