"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type {
  LiveSessionType,
  LiveSessionStatus,
  LiveSession,
  LiveSessionNote,
} from "@/lib/types/database";

export async function getLiveSessions() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("live_sessions")
    .select(
      "*, host:profiles!live_sessions_host_id_fkey(id, full_name, avatar_url, role), guest:profiles!live_sessions_guest_id_fkey(id, full_name, avatar_url, role)",
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching live sessions:", error);
    return [];
  }

  return (data ?? []) as LiveSession[];
}

export async function getLiveSession(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("live_sessions")
    .select(
      "*, host:profiles!live_sessions_host_id_fkey(id, full_name, avatar_url, role), guest:profiles!live_sessions_guest_id_fkey(id, full_name, avatar_url, role)",
    )
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching live session:", error);
    return null;
  }

  return data as LiveSession;
}

export async function createLiveSession(params: {
  title: string;
  description?: string;
  session_type: LiveSessionType;
  guest_id?: string;
  scheduled_at?: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifie");

  // Verifier role pour les sessions "live" (admin/manager uniquement)
  if (params.session_type === "live") {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile && !["admin", "manager"].includes(profile.role)) {
      throw new Error(
        "Seuls les admins et managers peuvent creer des sessions live",
      );
    }
  }

  const { data, error } = await supabase
    .from("live_sessions")
    .insert({
      title: params.title,
      description: params.description ?? null,
      host_id: user.id,
      guest_id: params.guest_id ?? null,
      session_type: params.session_type,
      status: params.scheduled_at ? "scheduled" : "live",
      scheduled_at: params.scheduled_at ?? null,
      started_at: params.scheduled_at ? null : new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/live");
  return data as LiveSession;
}

export async function updateLiveSessionStatus(
  id: string,
  status: LiveSessionStatus,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifie");

  // Verifier que l'utilisateur est host ou admin
  const { data: session } = await supabase
    .from("live_sessions")
    .select("host_id")
    .eq("id", id)
    .single();

  if (session && session.host_id !== user.id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile && profile.role !== "admin") {
      throw new Error(
        "Seuls le host ou un admin peuvent modifier cette session",
      );
    }
  }

  const updates: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (status === "live") {
    updates.started_at = new Date().toISOString();
  }

  if (status === "ended") {
    updates.ended_at = new Date().toISOString();

    // Calculer la duree reelle
    if (session) {
      const { data: fullSession } = await supabase
        .from("live_sessions")
        .select("started_at")
        .eq("id", id)
        .single();

      if (fullSession?.started_at) {
        const startedAt = new Date(fullSession.started_at).getTime();
        const now = Date.now();
        updates.actual_duration_seconds = Math.round((now - startedAt) / 1000);
      }
    }
  }

  const { error } = await supabase
    .from("live_sessions")
    .update(updates)
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/live");
}

export async function deleteLiveSession(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifie");

  // Verifier que l'utilisateur est host ou admin
  const { data: session } = await supabase
    .from("live_sessions")
    .select("host_id")
    .eq("id", id)
    .single();

  if (session && session.host_id !== user.id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile && profile.role !== "admin") {
      throw new Error(
        "Seuls le host ou un admin peuvent supprimer cette session",
      );
    }
  }

  const { error } = await supabase.from("live_sessions").delete().eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/live");
}

export async function getProfiles() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, role")
    .order("full_name");

  return data ?? [];
}

// Session notes
export async function saveSessionNote(params: {
  session_id: string;
  content: string;
  action_items: Array<{ text: string; done: boolean }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifie");

  const { data: existing } = await supabase
    .from("live_session_notes")
    .select("id")
    .eq("session_id", params.session_id)
    .eq("author_id", user.id)
    .single();

  if (existing) {
    const { error } = await supabase
      .from("live_session_notes")
      .update({
        content: params.content,
        action_items: params.action_items,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);

    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("live_session_notes").insert({
      session_id: params.session_id,
      author_id: user.id,
      content: params.content,
      action_items: params.action_items,
    });

    if (error) throw new Error(error.message);
  }
}

export async function getSessionNote(sessionId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("live_session_notes")
    .select("*")
    .eq("session_id", sessionId)
    .eq("author_id", user.id)
    .single();

  return data as LiveSessionNote | null;
}
