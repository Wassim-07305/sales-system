"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getTrainingGroups() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  try {
    const { data, error } = await supabase
      .from("training_groups")
      .select(
        "*, training_group_members(user_id, profiles(full_name, avatar_url, role)), training_group_sessions(id)",
      )
      .order("created_at", { ascending: false });

    if (error) throw error;

    return (data || []).map((g: Record<string, unknown>) => {
      const members = Array.isArray(g.training_group_members)
        ? g.training_group_members
        : [];
      const sessions = Array.isArray(g.training_group_sessions)
        ? g.training_group_sessions
        : [];
      return {
        id: g.id as string,
        name: g.name as string,
        description: (g.description as string) || "",
        niche: (g.niche as string) || "",
        member_count: members.length,
        sessions_count: sessions.length,
        avg_score: (g.avg_score as number) || 0,
        created_at: g.created_at as string,
      };
    });
  } catch {
    return [];
  }
}

export async function createTrainingGroup(data: {
  name: string;
  description: string;
  niche: string;
  memberIds: string[];
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  try {
    const { data: group, error } = await supabase
      .from("training_groups")
      .insert({
        name: data.name,
        description: data.description,
        niche: data.niche,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) throw error;

    if (data.memberIds.length > 0 && group) {
      const members = data.memberIds.map((userId) => ({
        group_id: group.id,
        user_id: userId,
      }));
      await supabase.from("training_group_members").insert(members);
    }

    revalidatePath("/roleplay/groups");
    return group;
  } catch {
    throw new Error("Impossible de créer le groupe d'entraînement");
  }
}

export async function getGroupDetails(groupId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  try {
    const { data: group, error } = await supabase
      .from("training_groups")
      .select("*")
      .eq("id", groupId)
      .single();

    if (error) throw error;

    const { data: members } = await supabase
      .from("training_group_members")
      .select("*, profiles(id, full_name, avatar_url, role)")
      .eq("group_id", groupId);

    const { data: sessions } = await supabase
      .from("training_group_sessions")
      .select("*")
      .eq("group_id", groupId)
      .order("date", { ascending: false });

    return {
      ...group,
      members: (members || []).map((m: Record<string, unknown>) => ({
        user_id: m.user_id,
        profile: Array.isArray(m.profiles) ? m.profiles[0] : m.profiles,
        sessions_attended: (m.sessions_attended as number) || 0,
        avg_score: (m.avg_score as number) || 0,
        progress: (m.progress as number) || 0,
      })),
      sessions: sessions || [],
    };
  } catch {
    return {
      id: groupId,
      name: "",
      description: "",
      niche: "",
      members: [],
      sessions: [],
    };
  }
}

export async function addGroupSession(
  groupId: string,
  data: {
    title: string;
    date: string;
    type: "roleplay" | "workshop" | "debrief";
  },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  try {
    const { error } = await supabase.from("training_group_sessions").insert({
      group_id: groupId,
      title: data.title,
      date: data.date,
      type: data.type,
      created_by: user.id,
    });

    if (error) throw error;
  } catch {
    // Demo mode — no-op
  }

  revalidatePath("/roleplay/groups");
}

export async function getGroupLeaderboard(groupId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  try {
    const { data: members } = await supabase
      .from("training_group_members")
      .select("*, profiles(full_name)")
      .eq("group_id", groupId)
      .order("avg_score", { ascending: false });

    return (members || []).map((m: Record<string, unknown>, i: number) => {
      const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
      return {
        rank: i + 1,
        name: (profile as Record<string, unknown>)?.full_name || "Membre",
        sessions: (m.sessions_attended as number) || 0,
        avg_score: (m.avg_score as number) || 0,
        progress: (m.progress as number) || 0,
      };
    });
  } catch {
    return [];
  }
}

export async function getTeamMembers() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url, role")
      .in("role", ["setter", "closer", "manager"])
      .order("full_name");

    if (error) throw error;
    return data || [];
  } catch {
    return [];
  }
}
