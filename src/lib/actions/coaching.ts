"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// ─── Types ───────────────────────────────────────────────────────
export interface CoachingObjective {
  id: string;
  title: string;
  description: string;
  category: "calls" | "deals" | "revenue" | "skills" | "other";
  targetValue: number;
  currentValue: number;
  targetDate: string;
  status: "in_progress" | "completed" | "overdue" | "at_risk";
  assigneeId: string;
  assigneeName?: string;
  createdBy: string;
  createdByName?: string;
  notes: string[];
  createdAt: string;
  updatedAt: string;
}

export interface DevelopmentPlan {
  id?: string;
  userId: string;
  skills: { name: string; level: number; target: number }[];
  actions: {
    id: string;
    title: string;
    description: string;
    priority: "high" | "medium" | "low";
    done: boolean;
  }[];
  resources: { title: string; url: string; type: string }[];
}

export interface CoachingNote {
  id: string;
  managerId: string;
  managerName: string;
  managerAvatar: string | null;
  userId: string;
  content: string;
  rating: number | null;
  sessionDate: string;
  createdAt: string;
}

export interface CoachingStats {
  totalObjectives: number;
  completedObjectives: number;
  overdueObjectives: number;
  averageProgress: number;
  totalNotes: number;
  lastCoachingDate: string | null;
}

// ─── Helper Functions ────────────────────────────────────────────

function computeStatus(
  currentValue: number,
  targetValue: number,
  targetDate: string,
  existingStatus?: string,
): CoachingObjective["status"] {
  if (existingStatus === "completed") return "completed";
  if (currentValue >= targetValue) return "completed";

  const now = new Date();
  const target = new Date(targetDate);

  if (now > target) return "overdue";

  // Calculate progress percentage
  const progressPercent =
    targetValue > 0 ? (currentValue / targetValue) * 100 : 0;

  // Calculate time percentage elapsed
  const totalTime =
    target.getTime() - (now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const timeElapsed =
    now.getTime() - (now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const timePercent = totalTime > 0 ? (timeElapsed / totalTime) * 100 : 100;

  // If progress is significantly behind schedule, mark as at_risk
  if (progressPercent < timePercent * 0.6) return "at_risk";

  return "in_progress";
}

// ─── GET OBJECTIVES ──────────────────────────────────────────────
export async function getObjectives(
  userId?: string,
): Promise<CoachingObjective[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifie");

  const targetId = userId || user.id;

  const { data, error } = await supabase
    .from("coaching_objectives")
    .select(
      `
      *,
      assignee:profiles!coaching_objectives_assignee_id_fkey(id, full_name),
      creator:profiles!coaching_objectives_created_by_fkey(id, full_name)
    `,
    )
    .eq("assignee_id", targetId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching coaching objectives:", error);
    return [];
  }

  if (!data) return [];

  return data.map((row) => {
    const assignee = Array.isArray(row.assignee)
      ? row.assignee[0]
      : row.assignee;
    const creator = Array.isArray(row.creator) ? row.creator[0] : row.creator;

    return {
      id: row.id,
      title: row.title,
      description: row.description || "",
      category: row.category as CoachingObjective["category"],
      targetValue: row.target_value,
      currentValue: row.current_value,
      targetDate: row.target_date,
      status: computeStatus(
        row.current_value,
        row.target_value,
        row.target_date,
        row.status,
      ),
      assigneeId: row.assignee_id,
      assigneeName: assignee?.full_name || null,
      createdBy: row.created_by,
      createdByName: creator?.full_name || null,
      notes: row.notes || [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  });
}

// ─── GET ALL OBJECTIVES (FOR MANAGERS) ──────────────────────────
export async function getAllObjectives(): Promise<CoachingObjective[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifie");

  // Check role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || (profile.role !== "admin" && profile.role !== "manager")) {
    throw new Error("Acces refuse : role admin ou manager requis");
  }

  const { data, error } = await supabase
    .from("coaching_objectives")
    .select(
      `
      *,
      assignee:profiles!coaching_objectives_assignee_id_fkey(id, full_name),
      creator:profiles!coaching_objectives_created_by_fkey(id, full_name)
    `,
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching all coaching objectives:", error);
    return [];
  }

  if (!data) return [];

  return data.map((row) => {
    const assignee = Array.isArray(row.assignee)
      ? row.assignee[0]
      : row.assignee;
    const creator = Array.isArray(row.creator) ? row.creator[0] : row.creator;

    return {
      id: row.id,
      title: row.title,
      description: row.description || "",
      category: row.category as CoachingObjective["category"],
      targetValue: row.target_value,
      currentValue: row.current_value,
      targetDate: row.target_date,
      status: computeStatus(
        row.current_value,
        row.target_value,
        row.target_date,
        row.status,
      ),
      assigneeId: row.assignee_id,
      assigneeName: assignee?.full_name || null,
      createdBy: row.created_by,
      createdByName: creator?.full_name || null,
      notes: row.notes || [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  });
}

// ─── CREATE OBJECTIVE ────────────────────────────────────────────
export async function createObjective(data: {
  title: string;
  description: string;
  category: "calls" | "deals" | "revenue" | "skills" | "other";
  targetValue: number;
  targetDate: string;
  assigneeId?: string;
}): Promise<CoachingObjective> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifie");

  // Check role — only admin/manager can create for others
  if (data.assigneeId && data.assigneeId !== user.id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || (profile.role !== "admin" && profile.role !== "manager")) {
      throw new Error("Acces refuse : role admin ou manager requis");
    }
  }

  const { data: objective, error } = await supabase
    .from("coaching_objectives")
    .insert({
      title: data.title,
      description: data.description,
      category: data.category,
      target_value: data.targetValue,
      current_value: 0,
      target_date: data.targetDate,
      status: "in_progress",
      assignee_id: data.assigneeId || user.id,
      created_by: user.id,
      notes: [],
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating objective:", error);
    throw new Error("Erreur lors de la creation de l'objectif");
  }

  revalidatePath("/team/coaching");
  revalidatePath("/profile/coaching");

  return {
    id: objective.id,
    title: objective.title,
    description: objective.description || "",
    category: objective.category as CoachingObjective["category"],
    targetValue: objective.target_value,
    currentValue: objective.current_value,
    targetDate: objective.target_date,
    status: "in_progress",
    assigneeId: objective.assignee_id,
    createdBy: objective.created_by,
    notes: objective.notes || [],
    createdAt: objective.created_at,
    updatedAt: objective.updated_at,
  };
}

// ─── UPDATE OBJECTIVE ────────────────────────────────────────────
export async function updateObjective(
  id: string,
  updates: Partial<{
    title: string;
    description: string;
    category: "calls" | "deals" | "revenue" | "skills" | "other";
    targetValue: number;
    targetDate: string;
  }>,
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifie");

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.title !== undefined) updateData.title = updates.title;
  if (updates.description !== undefined)
    updateData.description = updates.description;
  if (updates.category !== undefined) updateData.category = updates.category;
  if (updates.targetValue !== undefined)
    updateData.target_value = updates.targetValue;
  if (updates.targetDate !== undefined)
    updateData.target_date = updates.targetDate;

  const { error } = await supabase
    .from("coaching_objectives")
    .update(updateData)
    .eq("id", id);

  if (error) {
    console.error("Error updating objective:", error);
    throw new Error("Erreur lors de la mise a jour de l'objectif");
  }

  revalidatePath("/team/coaching");
  revalidatePath("/profile/coaching");
}

// ─── UPDATE PROGRESS ─────────────────────────────────────────────
export async function updateObjectiveProgress(
  id: string,
  currentValue: number,
  note?: string,
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifie");

  // Get current objective to merge notes and compute status
  const { data: existing, error: fetchError } = await supabase
    .from("coaching_objectives")
    .select("notes, target_value, target_date")
    .eq("id", id)
    .single();

  if (fetchError || !existing) {
    throw new Error("Objectif introuvable");
  }

  const existingNotes: string[] = existing.notes || [];
  if (note) {
    existingNotes.push(`[${new Date().toISOString().slice(0, 10)}] ${note}`);
  }

  const newStatus = computeStatus(
    currentValue,
    existing.target_value,
    existing.target_date,
  );

  const { error } = await supabase
    .from("coaching_objectives")
    .update({
      current_value: currentValue,
      notes: existingNotes,
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.error("Error updating objective progress:", error);
    throw new Error("Erreur lors de la mise a jour de la progression");
  }

  revalidatePath("/team/coaching");
  revalidatePath("/profile/coaching");
}

// ─── COMPLETE OBJECTIVE ──────────────────────────────────────────
export async function completeObjective(id: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifie");

  // Get target value to set current value equal
  const { data: existing } = await supabase
    .from("coaching_objectives")
    .select("target_value, notes")
    .eq("id", id)
    .single();

  const notes = existing?.notes || [];
  notes.push(
    `[${new Date().toISOString().slice(0, 10)}] Objectif marque comme complete`,
  );

  const { error } = await supabase
    .from("coaching_objectives")
    .update({
      status: "completed",
      current_value: existing?.target_value || 0,
      notes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.error("Error completing objective:", error);
    throw new Error("Erreur lors de la completion de l'objectif");
  }

  revalidatePath("/team/coaching");
  revalidatePath("/profile/coaching");
}

// ─── DELETE OBJECTIVE ────────────────────────────────────────────
export async function deleteObjective(id: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifie");

  const { error } = await supabase
    .from("coaching_objectives")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting objective:", error);
    throw new Error("Erreur lors de la suppression de l'objectif");
  }

  revalidatePath("/team/coaching");
  revalidatePath("/profile/coaching");
}

// ─── DEVELOPMENT PLAN ────────────────────────────────────────────
export async function getDevelopmentPlan(
  userId?: string,
): Promise<DevelopmentPlan | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifie");

  const targetId = userId || user.id;

  const { data, error } = await supabase
    .from("development_plans")
    .select("*")
    .eq("user_id", targetId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // No plan found - return null instead of error
      return null;
    }
    console.error("Error fetching development plan:", error);
    return null;
  }

  if (!data) return null;

  return {
    id: data.id,
    userId: data.user_id,
    skills: (data.skills as DevelopmentPlan["skills"]) || [],
    actions: (data.actions as DevelopmentPlan["actions"]) || [],
    resources: (data.resources as DevelopmentPlan["resources"]) || [],
  };
}

// ─── CREATE OR UPDATE DEVELOPMENT PLAN ──────────────────────────
export async function saveDevelopmentPlan(
  plan: Partial<DevelopmentPlan>,
  targetUserId?: string,
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifie");

  const userId = targetUserId || user.id;

  // Check role if updating another user's plan
  if (targetUserId && targetUserId !== user.id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || (profile.role !== "admin" && profile.role !== "manager")) {
      throw new Error("Acces refuse : role admin ou manager requis");
    }
  }

  // Upsert the development plan
  const { error } = await supabase.from("development_plans").upsert(
    {
      user_id: userId,
      skills: plan.skills || [],
      actions: plan.actions || [],
      resources: plan.resources || [],
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) {
    console.error("Error saving development plan:", error);
    throw new Error("Erreur lors de la sauvegarde du plan de developpement");
  }

  revalidatePath("/team/coaching");
  revalidatePath("/profile/coaching");
}

// ─── UPDATE PLAN ACTION STATUS ──────────────────────────────────
export async function togglePlanAction(
  actionId: string,
  done: boolean,
  targetUserId?: string,
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifie");

  const userId = targetUserId || user.id;

  // Get current plan
  const { data: plan, error: fetchError } = await supabase
    .from("development_plans")
    .select("actions")
    .eq("user_id", userId)
    .single();

  if (fetchError || !plan) {
    throw new Error("Plan de developpement introuvable");
  }

  const actions = (plan.actions as DevelopmentPlan["actions"]) || [];
  const updatedActions = actions.map((action) =>
    action.id === actionId ? { ...action, done } : action,
  );

  const { error } = await supabase
    .from("development_plans")
    .update({
      actions: updatedActions,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (error) {
    console.error("Error toggling plan action:", error);
    throw new Error("Erreur lors de la mise a jour de l'action");
  }

  revalidatePath("/team/coaching");
  revalidatePath("/profile/coaching");
}

// ─── COACHING NOTES ──────────────────────────────────────────────
export async function getCoachingNotes(
  userId: string,
): Promise<CoachingNote[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifie");

  // Use existing feedback_sessions table with type = "coaching"
  const { data, error } = await supabase
    .from("feedback_sessions")
    .select(
      "*, manager:profiles!feedback_sessions_manager_id_fkey(id, full_name, avatar_url)",
    )
    .eq("member_id", userId)
    .eq("type", "coaching")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching coaching notes:", error);
    return [];
  }

  if (!data) return [];

  return data.map((row) => {
    const manager = Array.isArray(row.manager) ? row.manager[0] : row.manager;
    return {
      id: row.id,
      managerId: row.manager_id,
      managerName: manager?.full_name || "Manager",
      managerAvatar: manager?.avatar_url || null,
      userId: row.member_id,
      content: row.content,
      rating: row.rating,
      sessionDate: row.created_at,
      createdAt: row.created_at,
    };
  });
}

// ─── CREATE COACHING NOTE ────────────────────────────────────────
export async function createCoachingNote(data: {
  memberId: string;
  content: string;
  rating?: number;
  title?: string;
}): Promise<CoachingNote> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifie");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, avatar_url")
    .eq("id", user.id)
    .single();

  if (!profile || (profile.role !== "admin" && profile.role !== "manager")) {
    throw new Error("Acces refuse : role admin ou manager requis");
  }

  const { data: note, error } = await supabase
    .from("feedback_sessions")
    .insert({
      manager_id: user.id,
      member_id: data.memberId,
      type: "coaching",
      title: data.title || "Session de coaching",
      content: data.content,
      rating: data.rating || null,
      action_items: [],
      status: "sent",
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating coaching note:", error);
    throw new Error("Erreur lors de la creation de la note");
  }

  revalidatePath("/team/coaching");

  return {
    id: note.id,
    managerId: user.id,
    managerName: profile.full_name || "Manager",
    managerAvatar: profile.avatar_url,
    userId: data.memberId,
    content: data.content,
    rating: data.rating || null,
    sessionDate: note.created_at,
    createdAt: note.created_at,
  };
}

// ─── DELETE COACHING NOTE ────────────────────────────────────────
export async function deleteCoachingNote(noteId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifie");

  const { error } = await supabase
    .from("feedback_sessions")
    .delete()
    .eq("id", noteId)
    .eq("manager_id", user.id);

  if (error) {
    console.error("Error deleting coaching note:", error);
    throw new Error("Erreur lors de la suppression de la note");
  }

  revalidatePath("/team/coaching");
}

// ─── GET COACHING STATS ──────────────────────────────────────────
export async function getCoachingStats(
  userId?: string,
): Promise<CoachingStats> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifie");

  const targetId = userId || user.id;

  // Get objectives
  const { data: objectives } = await supabase
    .from("coaching_objectives")
    .select("status, current_value, target_value")
    .eq("assignee_id", targetId);

  const total = objectives?.length || 0;
  const completed =
    objectives?.filter((o) => o.status === "completed").length || 0;
  const overdue = objectives?.filter((o) => o.status === "overdue").length || 0;

  let averageProgress = 0;
  if (objectives && objectives.length > 0) {
    const totalProgress = objectives.reduce((sum, o) => {
      const progress =
        o.target_value > 0 ? (o.current_value / o.target_value) * 100 : 0;
      return sum + Math.min(progress, 100);
    }, 0);
    averageProgress = totalProgress / objectives.length;
  }

  // Get coaching notes count
  const { count: notesCount } = await supabase
    .from("feedback_sessions")
    .select("id", { count: "exact", head: true })
    .eq("member_id", targetId)
    .eq("type", "coaching");

  // Get last coaching date
  const { data: lastNote } = await supabase
    .from("feedback_sessions")
    .select("created_at")
    .eq("member_id", targetId)
    .eq("type", "coaching")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  return {
    totalObjectives: total,
    completedObjectives: completed,
    overdueObjectives: overdue,
    averageProgress: Math.round(averageProgress),
    totalNotes: notesCount || 0,
    lastCoachingDate: lastNote?.created_at || null,
  };
}

// ─── GET TEAM COACHING OVERVIEW ──────────────────────────────────
export async function getTeamCoachingOverview(): Promise<{
  members: Array<{
    id: string;
    name: string;
    avatar: string | null;
    role: string;
    objectives: number;
    completed: number;
    overdue: number;
    averageProgress: number;
    lastCoaching: string | null;
  }>;
  totals: {
    totalMembers: number;
    totalObjectives: number;
    completedObjectives: number;
    overdueObjectives: number;
    averageTeamProgress: number;
  };
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifie");

  // Check role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || (profile.role !== "admin" && profile.role !== "manager")) {
    throw new Error("Acces refuse : role admin ou manager requis");
  }

  // Get all team members (setters and closers)
  const { data: members } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, role")
    .in("role", ["setter", "closer"])
    .order("full_name");

  if (!members) {
    return {
      members: [],
      totals: {
        totalMembers: 0,
        totalObjectives: 0,
        completedObjectives: 0,
        overdueObjectives: 0,
        averageTeamProgress: 0,
      },
    };
  }

  // Get all objectives
  const { data: allObjectives } = await supabase
    .from("coaching_objectives")
    .select("assignee_id, status, current_value, target_value");

  // Get last coaching sessions
  const { data: lastSessions } = await supabase
    .from("feedback_sessions")
    .select("member_id, created_at")
    .eq("type", "coaching")
    .order("created_at", { ascending: false });

  const objectivesByMember = new Map<string, typeof allObjectives>();
  const lastCoachingByMember = new Map<string, string>();

  (allObjectives || []).forEach((obj) => {
    const existing = objectivesByMember.get(obj.assignee_id) || [];
    existing.push(obj);
    objectivesByMember.set(obj.assignee_id, existing);
  });

  (lastSessions || []).forEach((session) => {
    if (!lastCoachingByMember.has(session.member_id)) {
      lastCoachingByMember.set(session.member_id, session.created_at);
    }
  });

  let totalObjectives = 0;
  let totalCompleted = 0;
  let totalOverdue = 0;
  let totalProgress = 0;

  const memberStats = members.map((member) => {
    const objectives = objectivesByMember.get(member.id) || [];
    const completed = objectives.filter((o) => o.status === "completed").length;
    const overdue = objectives.filter((o) => o.status === "overdue").length;

    let avgProgress = 0;
    if (objectives.length > 0) {
      const progress = objectives.reduce((sum, o) => {
        const p =
          o.target_value > 0 ? (o.current_value / o.target_value) * 100 : 0;
        return sum + Math.min(p, 100);
      }, 0);
      avgProgress = progress / objectives.length;
    }

    totalObjectives += objectives.length;
    totalCompleted += completed;
    totalOverdue += overdue;
    totalProgress += avgProgress;

    return {
      id: member.id,
      name: member.full_name || member.id,
      avatar: member.avatar_url,
      role: member.role,
      objectives: objectives.length,
      completed,
      overdue,
      averageProgress: Math.round(avgProgress),
      lastCoaching: lastCoachingByMember.get(member.id) || null,
    };
  });

  return {
    members: memberStats,
    totals: {
      totalMembers: members.length,
      totalObjectives,
      completedObjectives: totalCompleted,
      overdueObjectives: totalOverdue,
      averageTeamProgress:
        members.length > 0 ? Math.round(totalProgress / members.length) : 0,
    },
  };
}
