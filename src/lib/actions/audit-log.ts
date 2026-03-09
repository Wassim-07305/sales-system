"use server";

import { createClient } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// Log Audit Event
// ---------------------------------------------------------------------------

export async function logAuditEvent(params: {
  action: string;
  entity_type: string;
  entity_id?: string;
  details?: Record<string, unknown>;
}): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("audit_logs").insert({
    user_id: user.id,
    action: params.action,
    entity_type: params.entity_type,
    entity_id: params.entity_id ?? null,
    details: params.details ?? {},
  });
}

// ---------------------------------------------------------------------------
// Get Audit Logs
// ---------------------------------------------------------------------------

export interface AuditLogEntry {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown>;
  ip_address: string | null;
  created_at: string;
  user_name: string | null;
}

export async function getAuditLogs(filters?: {
  entity_type?: string;
  user_id?: string;
  limit?: number;
}): Promise<AuditLogEntry[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const limit = filters?.limit ?? 50;

  let query = supabase
    .from("audit_logs")
    .select("*, profile:profiles!user_id(full_name)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (filters?.entity_type) {
    query = query.eq("entity_type", filters.entity_type);
  }

  if (filters?.user_id) {
    query = query.eq("user_id", filters.user_id);
  }

  const { data } = await query;

  if (!data) return [];

  return data.map((row: Record<string, unknown>) => {
    const profile = row.profile as { full_name: string | null } | null;
    return {
      id: row.id as string,
      user_id: row.user_id as string | null,
      action: row.action as string,
      entity_type: row.entity_type as string,
      entity_id: row.entity_id as string | null,
      details: (row.details as Record<string, unknown>) ?? {},
      ip_address: row.ip_address as string | null,
      created_at: row.created_at as string,
      user_name: profile?.full_name ?? null,
    };
  });
}
