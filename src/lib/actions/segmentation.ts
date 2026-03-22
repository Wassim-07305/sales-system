"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// ─── Types (local only, not exported from "use server") ─────────────

type SegmentFilter = {
  field: string;
  operator: "eq" | "neq" | "gt" | "lt" | "contains" | "not_contains";
  value: string;
};

type Segment = {
  id: string;
  name: string;
  description: string | null;
  filters: SegmentFilter[];
  color: string;
  created_at: string;
  updated_at: string;
};

// ─── Helpers ────────────────────────────────────────────────────────

function parseFilters(raw: unknown): SegmentFilter[] {
  if (!raw || !Array.isArray(raw)) return [];
  return raw as SegmentFilter[];
}

// ─── getSegments ────────────────────────────────────────────────────

export async function getSegments() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  try {
    const { data, error } = await supabase
      .from("prospect_segments")
      .select("*")
      .order("created_at", { ascending: false });

    if (error || !data || data.length === 0) {
      return [];
    }

    return data.map((row: Record<string, unknown>) => ({
      id: row.id as string,
      name: row.name as string,
      description: (row.description as string) || null,
      filters: parseFilters(row.filters),
      color: (row.color as string) || "#10b981",
      created_at: row.created_at as string,
      updated_at: (row.updated_at as string) || (row.created_at as string),
    }));
  } catch {
    return [];
  }
}

// ─── createSegment ──────────────────────────────────────────────────

export async function createSegment(data: {
  name: string;
  description: string;
  filters: { field: string; operator: string; value: string }[];
  color?: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifie");

  const { error } = await supabase.from("prospect_segments").insert({
    name: data.name,
    description: data.description || null,
    filters: data.filters,
    color: data.color || "#10b981",
    user_id: user.id,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/prospecting/segments");
}

// ─── updateSegment ──────────────────────────────────────────────────

export async function updateSegment(
  id: string,
  data: {
    name?: string;
    description?: string;
    filters?: { field: string; operator: string; value: string }[];
    color?: string;
  },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifie");

  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.filters !== undefined) updateData.filters = data.filters;
  if (data.color !== undefined) updateData.color = data.color;
  updateData.updated_at = new Date().toISOString();

  const { error } = await supabase
    .from("prospect_segments")
    .update(updateData)
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/prospecting/segments");
}

// ─── deleteSegment ──────────────────────────────────────────────────

export async function deleteSegment(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifie");

  const { error } = await supabase
    .from("prospect_segments")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/prospecting/segments");
}

// ─── getSegmentProspects ────────────────────────────────────────────

export async function getSegmentProspects(segmentId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  // Get segment filters
  let filters: SegmentFilter[] = [];

  const { data: segment } = await supabase
    .from("prospect_segments")
    .select("filters")
    .eq("id", segmentId)
    .single();

  if (!segment) return [];
  filters = parseFilters(segment.filters);

  // Build query with filters
  let query = supabase
    .from("prospects")
    .select(
      "id, name, status, platform, company, created_at, last_message_at, profile_url",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  for (const filter of filters) {
    switch (filter.field) {
      case "status":
        if (filter.operator === "eq") query = query.eq("status", filter.value);
        if (filter.operator === "neq")
          query = query.neq("status", filter.value);
        break;
      case "source":
      case "platform":
        if (filter.operator === "eq")
          query = query.eq("platform", filter.value);
        if (filter.operator === "neq")
          query = query.neq("platform", filter.value);
        break;
      case "company":
        if (filter.operator === "eq") query = query.eq("company", filter.value);
        if (filter.operator === "contains")
          query = query.ilike("company", `%${filter.value}%`);
        if (filter.operator === "not_contains")
          query = query.not("company", "ilike", `%${filter.value}%`);
        break;
      case "created_at":
        if (filter.operator === "gt")
          query = query.gt("created_at", filter.value);
        if (filter.operator === "lt")
          query = query.lt("created_at", filter.value);
        break;
      case "last_contact":
        if (filter.value === "30_days_ago") {
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          if (filter.operator === "lt") {
            query = query.or(
              `last_message_at.lt.${thirtyDaysAgo.toISOString()},last_message_at.is.null`,
            );
          }
          if (filter.operator === "gt") {
            query = query.gte("last_message_at", thirtyDaysAgo.toISOString());
          }
        } else {
          if (filter.operator === "gt")
            query = query.gt("last_message_at", filter.value);
          if (filter.operator === "lt")
            query = query.lt("last_message_at", filter.value);
        }
        break;
    }
  }

  const { data: prospects } = await query;
  let result = prospects || [];

  // Handle score/temperature filters (need join with prospect_scores)
  const scoreFilters = filters.filter(
    (f) => f.field === "score" || f.field === "temperature",
  );
  if (scoreFilters.length > 0 && result.length > 0) {
    const prospectIds = result.map(
      (p: Record<string, unknown>) => p.id as string,
    );
    let scoreQuery = supabase
      .from("prospect_scores")
      .select("prospect_id, total_score, temperature")
      .in("prospect_id", prospectIds);

    for (const sf of scoreFilters) {
      if (sf.field === "temperature") {
        if (sf.operator === "eq")
          scoreQuery = scoreQuery.eq("temperature", sf.value);
        if (sf.operator === "neq")
          scoreQuery = scoreQuery.neq("temperature", sf.value);
      }
      if (sf.field === "score") {
        if (sf.operator === "gt")
          scoreQuery = scoreQuery.gt("total_score", parseInt(sf.value));
        if (sf.operator === "lt")
          scoreQuery = scoreQuery.lt("total_score", parseInt(sf.value));
        if (sf.operator === "eq")
          scoreQuery = scoreQuery.eq("total_score", parseInt(sf.value));
      }
    }

    const { data: scores } = await scoreQuery;
    const matchingIds = new Set(
      (scores || []).map(
        (s: Record<string, unknown>) => s.prospect_id as string,
      ),
    );
    result = result.filter((p: Record<string, unknown>) =>
      matchingIds.has(p.id as string),
    );
  }

  // Handle tags filter in-memory (tags might be stored as array or jsonb)
  const tagsFilters = filters.filter((f) => f.field === "tags");
  if (tagsFilters.length > 0) {
    result = result.filter((p: Record<string, unknown>) => {
      const tags = (p.tags as string[] | null) || [];
      return tagsFilters.every((tf) => {
        if (tf.operator === "contains")
          return tags.some((t) =>
            t.toLowerCase().includes(tf.value.toLowerCase()),
          );
        if (tf.operator === "not_contains")
          return !tags.some((t) =>
            t.toLowerCase().includes(tf.value.toLowerCase()),
          );
        return true;
      });
    });
  }

  return result;
}

// ─── getSegmentStats ────────────────────────────────────────────────

export async function getSegmentStats() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return {
      totalSegments: 0,
      totalProspects: 0,
      counts: {} as Record<string, number>,
    };

  const segments = await getSegments();
  const counts: Record<string, number> = {};

  // Count prospects for each segment
  for (const segment of segments) {
    const prospects = await getSegmentProspects(segment.id);
    counts[segment.id] = prospects.length;
  }

  const { data: allProspects } = await supabase.from("prospects").select("id");

  return {
    totalSegments: segments.length,
    totalProspects: allProspects?.length || 0,
    counts,
  };
}

// ─── sendMessageToSegment ────────────────────────────────────────────

export async function sendMessageToSegment(
  segmentId: string,
  message: string,
  channel: string,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  // Get segment prospects
  const prospects = await getSegmentProspects(segmentId);
  if (!prospects || prospects.length === 0) {
    throw new Error("Aucun prospect dans ce segment");
  }

  let sent = 0;
  for (const prospect of prospects) {
    try {
      const p = prospect as Record<string, unknown>;
      // Create a message record
      await supabase.from("prospect_messages").insert({
        prospect_id: p.id as string,
        sender_id: user.id,
        content: message,
        channel: channel || "app",
        status: "sent",
        sent_at: new Date().toISOString(),
      });
      sent++;
    } catch {
      // Continue on individual errors
    }
  }

  revalidatePath("/prospecting");
  return { sent, total: prospects.length };
}
