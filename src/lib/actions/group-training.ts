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
    // Fallback demo data
    return [
      {
        id: "demo-1",
        name: "Closers débutants",
        description:
          "Groupe de formation pour les nouveaux closers. Focus sur les fondamentaux de la vente.",
        niche: "Closing",
        member_count: 6,
        sessions_count: 12,
        avg_score: 72,
        created_at: "2026-02-01T10:00:00Z",
      },
      {
        id: "demo-2",
        name: "Setters avancés",
        description:
          "Perfectionnement des techniques de setting pour profils confirmés.",
        niche: "Setting",
        member_count: 4,
        sessions_count: 8,
        avg_score: 85,
        created_at: "2026-02-10T10:00:00Z",
      },
      {
        id: "demo-3",
        name: "Objection handling",
        description:
          "Maîtrise des techniques de traitement des objections courantes.",
        niche: "Objection handling",
        member_count: 8,
        sessions_count: 15,
        avg_score: 68,
        created_at: "2026-01-20T10:00:00Z",
      },
      {
        id: "demo-4",
        name: "Prospection B2B",
        description: "Stratégies de prospection avancées pour le marché B2B.",
        niche: "Prospection",
        member_count: 5,
        sessions_count: 10,
        avg_score: 78,
        created_at: "2026-02-15T10:00:00Z",
      },
      {
        id: "demo-5",
        name: "Négociation",
        description:
          "Techniques de négociation et gestion des prix en closing.",
        niche: "Négociation",
        member_count: 3,
        sessions_count: 6,
        avg_score: 81,
        created_at: "2026-03-01T10:00:00Z",
      },
    ];
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
    // Demo mode fallback
    revalidatePath("/roleplay/groups");
    return { id: `demo-${Date.now()}`, ...data };
  }
}

export async function getGroupDetails(groupId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Demo data for demo group IDs
  if (groupId.startsWith("demo-")) {
    return getDemoGroupDetails(groupId);
  }

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
    return getDemoGroupDetails(groupId);
  }
}

function getDemoGroupDetails(groupId: string) {
  const demoMembers = [
    {
      user_id: "u1",
      profile: {
        id: "u1",
        full_name: "Lucas Martin",
        avatar_url: null,
        role: "closer",
      },
      sessions_attended: 10,
      avg_score: 82,
      progress: 15,
    },
    {
      user_id: "u2",
      profile: {
        id: "u2",
        full_name: "Emma Dupont",
        avatar_url: null,
        role: "setter",
      },
      sessions_attended: 8,
      avg_score: 76,
      progress: 12,
    },
    {
      user_id: "u3",
      profile: {
        id: "u3",
        full_name: "Thomas Bernard",
        avatar_url: null,
        role: "closer",
      },
      sessions_attended: 12,
      avg_score: 88,
      progress: 20,
    },
    {
      user_id: "u4",
      profile: {
        id: "u4",
        full_name: "Julie Leroy",
        avatar_url: null,
        role: "setter",
      },
      sessions_attended: 6,
      avg_score: 71,
      progress: 8,
    },
  ];

  const demoSessions = [
    {
      id: "s1",
      title: "Gestion des objections prix",
      date: "2026-03-08T14:00:00Z",
      type: "roleplay",
      participants: 4,
    },
    {
      id: "s2",
      title: "Debrief semaine 10",
      date: "2026-03-07T10:00:00Z",
      type: "debrief",
      participants: 3,
    },
    {
      id: "s3",
      title: "Techniques de closing avancées",
      date: "2026-03-05T14:00:00Z",
      type: "workshop",
      participants: 4,
    },
    {
      id: "s4",
      title: "Simulation appel découverte",
      date: "2026-03-03T09:00:00Z",
      type: "roleplay",
      participants: 4,
    },
  ];

  const groups: Record<
    string,
    { name: string; description: string; niche: string }
  > = {
    "demo-1": {
      name: "Closers débutants",
      description: "Groupe de formation pour les nouveaux closers.",
      niche: "Closing",
    },
    "demo-2": {
      name: "Setters avancés",
      description: "Perfectionnement des techniques de setting.",
      niche: "Setting",
    },
    "demo-3": {
      name: "Objection handling",
      description: "Maîtrise du traitement des objections.",
      niche: "Objection handling",
    },
    "demo-4": {
      name: "Prospection B2B",
      description: "Stratégies de prospection avancées B2B.",
      niche: "Prospection",
    },
    "demo-5": {
      name: "Négociation",
      description: "Techniques de négociation et gestion des prix.",
      niche: "Négociation",
    },
  };

  const g = groups[groupId] || groups["demo-1"];

  return {
    id: groupId,
    ...g,
    avg_score: 79,
    created_at: "2026-02-01T10:00:00Z",
    members: demoMembers,
    sessions: demoSessions,
  };
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

  if (groupId.startsWith("demo-")) {
    return [
      {
        rank: 1,
        name: "Thomas Bernard",
        sessions: 12,
        avg_score: 88,
        progress: 20,
      },
      {
        rank: 2,
        name: "Lucas Martin",
        sessions: 10,
        avg_score: 82,
        progress: 15,
      },
      {
        rank: 3,
        name: "Emma Dupont",
        sessions: 8,
        avg_score: 76,
        progress: 12,
      },
      { rank: 4, name: "Julie Leroy", sessions: 6, avg_score: 71, progress: 8 },
    ];
  }

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
    // Demo fallback
    return [
      { id: "u1", full_name: "Lucas Martin", avatar_url: null, role: "closer" },
      { id: "u2", full_name: "Emma Dupont", avatar_url: null, role: "setter" },
      {
        id: "u3",
        full_name: "Thomas Bernard",
        avatar_url: null,
        role: "closer",
      },
      { id: "u4", full_name: "Julie Leroy", avatar_url: null, role: "setter" },
      {
        id: "u5",
        full_name: "Sophie Moreau",
        avatar_url: null,
        role: "manager",
      },
      {
        id: "u6",
        full_name: "Antoine Petit",
        avatar_url: null,
        role: "closer",
      },
    ];
  }
}
