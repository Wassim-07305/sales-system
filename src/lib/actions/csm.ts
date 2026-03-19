"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// ─── Helpers ─────────────────────────────────────────────────────────

async function requireCsmOrAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["csm", "admin", "manager"].includes(profile.role)) {
    throw new Error("Accès refusé");
  }

  return { supabase, userId: user.id, role: profile.role };
}

// ─── Dashboard Data ──────────────────────────────────────────────────

export interface CsmClientInfo {
  id: string;
  full_name: string | null;
  email: string;
  company: string | null;
  role: string;
  health_score: number;
  updated_at: string;
  onboarding_completed: boolean;
}

/**
 * Get all clients with their health status for CSM dashboard.
 */
export async function getCsmClients(): Promise<CsmClientInfo[]> {
  const { supabase } = await requireCsmOrAdmin();

  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, email, company, role, health_score, updated_at, onboarding_completed")
    .in("role", ["client_b2b", "client_b2c"])
    .order("health_score", { ascending: true });

  return (data || []) as CsmClientInfo[];
}

/**
 * Get clients at risk (health_score < 50 or inactive 7+ days).
 */
export async function getClientsAtRisk(): Promise<CsmClientInfo[]> {
  const { supabase } = await requireCsmOrAdmin();

  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();

  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, email, company, role, health_score, updated_at, onboarding_completed")
    .in("role", ["client_b2b", "client_b2c"])
    .or(`health_score.lt.50,updated_at.lt.${sevenDaysAgo}`)
    .order("health_score", { ascending: true });

  return (data || []) as CsmClientInfo[];
}

// ─── Kick-cases ──────────────────────────────────────────────────────

export interface KickCase {
  id: string;
  csm_id: string;
  client_id: string;
  type: string;
  description: string;
  action_entreprise: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  client?: { full_name: string | null; company: string | null };
}

export async function getKickCases(filter?: {
  status?: string;
  week?: boolean;
}): Promise<KickCase[]> {
  const { supabase } = await requireCsmOrAdmin();

  let query = supabase
    .from("csm_kickcases")
    .select("*, client:profiles!csm_kickcases_client_id_fkey(full_name, company)")
    .order("created_at", { ascending: false });

  if (filter?.status && filter.status !== "all") {
    query = query.eq("status", filter.status);
  }

  if (filter?.week) {
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    query = query.gte("created_at", weekAgo);
  }

  const { data } = await query;

  return (data || []).map((k) => ({
    ...k,
    client: Array.isArray(k.client) ? k.client[0] : k.client,
  })) as KickCase[];
}

export async function createKickCase(data: {
  client_id: string;
  type: string;
  description: string;
  action_entreprise?: string;
}): Promise<{ error?: string }> {
  const { supabase, userId } = await requireCsmOrAdmin();

  const { error } = await supabase.from("csm_kickcases").insert({
    csm_id: userId,
    client_id: data.client_id,
    type: data.type,
    description: data.description,
    action_entreprise: data.action_entreprise || null,
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  return {};
}

export async function updateKickCaseStatus(
  id: string,
  status: string,
): Promise<{ error?: string }> {
  const { supabase } = await requireCsmOrAdmin();

  const { error } = await supabase
    .from("csm_kickcases")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  return {};
}

// ─── Feedbacks ───────────────────────────────────────────────────────

export interface CsmFeedback {
  id: string;
  csm_id: string;
  source_name: string;
  category: string;
  feedback: string;
  priority: string;
  status: string;
  created_at: string;
}

export async function getFeedbacks(filter?: {
  status?: string;
}): Promise<CsmFeedback[]> {
  const { supabase } = await requireCsmOrAdmin();

  let query = supabase
    .from("csm_feedbacks")
    .select("*")
    .order("created_at", { ascending: false });

  if (filter?.status && filter.status !== "all") {
    query = query.eq("status", filter.status);
  }

  const { data } = await query;
  return (data || []) as CsmFeedback[];
}

export async function createFeedback(data: {
  source_name: string;
  category: string;
  feedback: string;
  priority: string;
}): Promise<{ error?: string }> {
  const { supabase, userId } = await requireCsmOrAdmin();

  const { error } = await supabase.from("csm_feedbacks").insert({
    csm_id: userId,
    source_name: data.source_name,
    category: data.category,
    feedback: data.feedback,
    priority: data.priority,
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  return {};
}

export async function updateFeedbackStatus(
  id: string,
  status: string,
): Promise<{ error?: string }> {
  const { supabase } = await requireCsmOrAdmin();

  const { error } = await supabase
    .from("csm_feedbacks")
    .update({ status })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  return {};
}
