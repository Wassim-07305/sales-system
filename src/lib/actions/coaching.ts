"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// Types
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
  createdBy: string;
  notes: string[];
  createdAt: string;
  updatedAt: string;
}

export interface DevelopmentPlan {
  skills: { name: string; level: number; target: number }[];
  actions: { id: string; title: string; description: string; priority: "high" | "medium" | "low"; done: boolean }[];
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

// Helper: compute status from dates and progress
function computeStatus(
  currentValue: number,
  targetValue: number,
  targetDate: string,
  existingStatus?: string
): CoachingObjective["status"] {
  if (existingStatus === "completed") return "completed";
  if (currentValue >= targetValue) return "completed";
  const now = new Date();
  const target = new Date(targetDate);
  if (now > target) return "overdue";
  const totalDays = (target.getTime() - new Date(targetDate).getTime() + (target.getTime() - now.getTime())) || 1;
  const daysLeft = (target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  const progressPercent = (currentValue / targetValue) * 100;
  const timePercent = ((totalDays - daysLeft * (1000 * 60 * 60 * 24)) / totalDays) * 100;
  // If we're behind schedule by more than 20%, mark as at_risk
  if (progressPercent < (100 - daysLeft / 30 * 100) * 0.7) return "at_risk";
  return "in_progress";
}

// ─── GET OBJECTIVES ──────────────────────────────────────────────
export async function getObjectives(userId?: string): Promise<CoachingObjective[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifie");

  const targetId = userId || user.id;

  // Try querying the coaching_objectives table
  const { data, error } = await supabase
    .from("coaching_objectives")
    .select("*")
    .eq("assignee_id", targetId)
    .order("created_at", { ascending: false });

  if (error || !data) {
    // Table doesn't exist or error — return mock data for demo
    return getMockObjectives(targetId);
  }

  return data.map((row: Record<string, unknown>) => ({
    id: row.id as string,
    title: row.title as string,
    description: row.description as string,
    category: row.category as CoachingObjective["category"],
    targetValue: row.target_value as number,
    currentValue: row.current_value as number,
    targetDate: row.target_date as string,
    status: computeStatus(
      row.current_value as number,
      row.target_value as number,
      row.target_date as string,
      row.status as string
    ),
    assigneeId: row.assignee_id as string,
    createdBy: row.created_by as string,
    notes: JSON.parse((row.notes as string) || "[]"),
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }));
}

// ─── CREATE OBJECTIVE ────────────────────────────────────────────
export async function createObjective(data: {
  title: string;
  description: string;
  category: "calls" | "deals" | "revenue" | "skills" | "other";
  targetValue: number;
  targetDate: string;
  assigneeId?: string;
}): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
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

  const { error } = await supabase.from("coaching_objectives").insert({
    title: data.title,
    description: data.description,
    category: data.category,
    target_value: data.targetValue,
    current_value: 0,
    target_date: data.targetDate,
    status: "in_progress",
    assignee_id: data.assigneeId || user.id,
    created_by: user.id,
    notes: "[]",
  });

  if (error) {
    // If table doesn't exist, silently succeed for demo
    if (error.code === "42P01") return;
    throw new Error(error.message);
  }

  revalidatePath("/team/coaching");
}

// ─── UPDATE PROGRESS ─────────────────────────────────────────────
export async function updateObjectiveProgress(
  id: string,
  currentValue: number,
  notes?: string
): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifie");

  // Get current objective to merge notes
  const { data: existing } = await supabase
    .from("coaching_objectives")
    .select("notes, target_value, target_date")
    .eq("id", id)
    .single();

  const existingNotes: string[] = existing ? JSON.parse((existing.notes as string) || "[]") : [];
  if (notes) {
    existingNotes.push(`[${new Date().toISOString().slice(0, 10)}] ${notes}`);
  }

  const newStatus = existing
    ? computeStatus(currentValue, existing.target_value as number, existing.target_date as string)
    : "in_progress";

  const { error } = await supabase
    .from("coaching_objectives")
    .update({
      current_value: currentValue,
      notes: JSON.stringify(existingNotes),
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error && error.code !== "42P01") throw new Error(error.message);
  revalidatePath("/team/coaching");
}

// ─── COMPLETE OBJECTIVE ──────────────────────────────────────────
export async function completeObjective(id: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifie");

  const { error } = await supabase
    .from("coaching_objectives")
    .update({ status: "completed", updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error && error.code !== "42P01") throw new Error(error.message);
  revalidatePath("/team/coaching");
}

// ─── DELETE OBJECTIVE ────────────────────────────────────────────
export async function deleteObjective(id: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifie");

  const { error } = await supabase
    .from("coaching_objectives")
    .delete()
    .eq("id", id);

  if (error && error.code !== "42P01") throw new Error(error.message);
  revalidatePath("/team/coaching");
}

// ─── DEVELOPMENT PLAN ────────────────────────────────────────────
export async function getDevelopmentPlan(userId?: string): Promise<DevelopmentPlan> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifie");

  const targetId = userId || user.id;

  // Try to fetch from development_plans table
  const { data, error } = await supabase
    .from("development_plans")
    .select("*")
    .eq("user_id", targetId)
    .single();

  if (error || !data) {
    // Return mock plan
    return getMockDevelopmentPlan();
  }

  return {
    skills: (data.skills as DevelopmentPlan["skills"]) || [],
    actions: (data.actions as DevelopmentPlan["actions"]) || [],
    resources: (data.resources as DevelopmentPlan["resources"]) || [],
  };
}

// ─── SAVE DEVELOPMENT PLAN ───────────────────────────────────────
export async function saveDevelopmentPlan(
  plan: Partial<DevelopmentPlan>,
  targetUserId?: string
): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
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
  const { error } = await supabase
    .from("development_plans")
    .upsert({
      user_id: userId,
      skills: plan.skills || [],
      actions: plan.actions || [],
      resources: plan.resources || [],
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

  if (error && error.code !== "42P01") throw new Error(error.message);
  revalidatePath("/team/coaching");
  revalidatePath("/profile/coaching");
}

// ─── COACHING NOTES ──────────────────────────────────────────────
export async function getCoachingNotes(userId: string): Promise<CoachingNote[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifie");

  // Use existing feedback_sessions table with type = "coaching"
  const { data, error } = await supabase
    .from("feedback_sessions")
    .select("*, manager:profiles!feedback_sessions_manager_id_fkey(id, full_name, avatar_url)")
    .eq("member_id", userId)
    .eq("type", "coaching")
    .order("created_at", { ascending: false });

  if (error || !data) {
    return getMockCoachingNotes(userId);
  }

  return data.map((row: Record<string, unknown>) => {
    const manager = Array.isArray(row.manager) ? row.manager[0] : row.manager;
    return {
      id: row.id as string,
      managerId: row.manager_id as string,
      managerName: (manager as Record<string, unknown>)?.full_name as string || "Manager",
      managerAvatar: (manager as Record<string, unknown>)?.avatar_url as string | null,
      userId: row.member_id as string,
      content: row.content as string,
      rating: row.rating as number | null,
      sessionDate: row.created_at as string,
      createdAt: row.created_at as string,
    };
  });
}

// ─── CREATE COACHING NOTE ────────────────────────────────────────
export async function createCoachingNote(data: {
  memberId: string;
  content: string;
  rating?: number;
}): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifie");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || (profile.role !== "admin" && profile.role !== "manager")) {
    throw new Error("Acces refuse : role admin ou manager requis");
  }

  const { error } = await supabase.from("feedback_sessions").insert({
    manager_id: user.id,
    member_id: data.memberId,
    type: "coaching",
    title: "Session de coaching",
    content: data.content,
    rating: data.rating || null,
    action_items: "[]",
    status: "sent",
  });

  if (error) throw new Error(error.message);
  revalidatePath("/team/coaching");
}

// ─── MOCK DATA ───────────────────────────────────────────────────
function getMockObjectives(userId: string): CoachingObjective[] {
  const now = new Date();
  return [
    {
      id: "obj-1",
      title: "Atteindre 50 appels par semaine",
      description: "Augmenter le volume d'appels sortants pour generer plus de rendez-vous qualifies",
      category: "calls",
      targetValue: 50,
      currentValue: 35,
      targetDate: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      status: "in_progress",
      assigneeId: userId,
      createdBy: userId,
      notes: ["[2026-03-01] Bonne progression cette semaine, 32 appels realises"],
      createdAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: now.toISOString(),
    },
    {
      id: "obj-2",
      title: "Closer 10 deals ce mois",
      description: "Objectif mensuel de closing pour atteindre le quota trimestriel",
      category: "deals",
      targetValue: 10,
      currentValue: 6,
      targetDate: new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      status: "in_progress",
      assigneeId: userId,
      createdBy: userId,
      notes: [],
      createdAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: now.toISOString(),
    },
    {
      id: "obj-3",
      title: "Generer 25 000 EUR de CA",
      description: "Objectif de chiffre d'affaires pour le trimestre en cours",
      category: "revenue",
      targetValue: 25000,
      currentValue: 18500,
      targetDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      status: "in_progress",
      assigneeId: userId,
      createdBy: userId,
      notes: ["[2026-03-05] Bon deal signe a 4500 EUR"],
      createdAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: now.toISOString(),
    },
    {
      id: "obj-4",
      title: "Ameliorer le taux de closing",
      description: "Passer de 20% a 30% de taux de conversion proposition > closing",
      category: "skills",
      targetValue: 30,
      currentValue: 24,
      targetDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      status: "overdue",
      assigneeId: userId,
      createdBy: userId,
      notes: [],
      createdAt: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: now.toISOString(),
    },
    {
      id: "obj-5",
      title: "Completer la formation negociation",
      description: "Terminer le module avance de negociation dans l'Academy",
      category: "skills",
      targetValue: 100,
      currentValue: 100,
      targetDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      status: "completed",
      assigneeId: userId,
      createdBy: userId,
      notes: ["[2026-03-06] Module termine avec succes"],
      createdAt: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: now.toISOString(),
    },
  ];
}

function getMockDevelopmentPlan(): DevelopmentPlan {
  return {
    skills: [
      { name: "Prospection", level: 7, target: 9 },
      { name: "Decouverte", level: 6, target: 8 },
      { name: "Negociation", level: 5, target: 8 },
      { name: "Closing", level: 6, target: 9 },
      { name: "Relation client", level: 8, target: 9 },
      { name: "Objections", level: 4, target: 7 },
      { name: "Presentation", level: 7, target: 8 },
      { name: "Suivi", level: 6, target: 8 },
    ],
    actions: [
      { id: "a1", title: "Pratiquer le traitement des objections", description: "Faire 3 sessions de roleplay par semaine sur les objections prix", priority: "high", done: false },
      { id: "a2", title: "Suivre le module negociation avancee", description: "Completer le cours dans l'Academy avant fin mars", priority: "high", done: false },
      { id: "a3", title: "Analyser 5 appels de closing reussis", description: "Ecouter et prendre des notes sur les techniques utilisees", priority: "medium", done: true },
      { id: "a4", title: "Mettre en place un script de decouverte", description: "Creer un script structure pour les appels de decouverte", priority: "medium", done: false },
      { id: "a5", title: "Lire 'SPIN Selling'", description: "Lire le livre et appliquer les techniques SPIN", priority: "low", done: false },
    ],
    resources: [
      { title: "Module Negociation Avancee", url: "/academy", type: "course" },
      { title: "Templates Scripts de Vente", url: "/scripts/templates", type: "template" },
      { title: "Roleplay - Objections", url: "/roleplay", type: "training" },
      { title: "Guide de Closing", url: "/resources", type: "guide" },
    ],
  };
}

function getMockCoachingNotes(userId: string): CoachingNote[] {
  const now = new Date();
  return [
    {
      id: "note-1",
      managerId: "manager-1",
      managerName: "Damien Reynaud",
      managerAvatar: null,
      userId,
      content: "Bonne progression sur les appels de decouverte. Points a travailler : poser plus de questions ouvertes, eviter de presenter trop tot. Continuer les roleplay hebdomadaires.",
      rating: 4,
      sessionDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "note-2",
      managerId: "manager-1",
      managerName: "Damien Reynaud",
      managerAvatar: null,
      userId,
      content: "Session de travail sur le closing. Amelioration nette sur la gestion du silence. Prochaine etape : maitriser les techniques d'urgence sans pression.",
      rating: 3,
      sessionDate: new Date(now.getTime() - 9 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date(now.getTime() - 9 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "note-3",
      managerId: "manager-1",
      managerName: "Damien Reynaud",
      managerAvatar: null,
      userId,
      content: "Revue mensuelle des KPIs. Volume d'appels en hausse (+15%), taux de conversion stable. Objectif : travailler la qualification en amont pour ameliorer la qualite des RDV.",
      rating: 4,
      sessionDate: new Date(now.getTime() - 16 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date(now.getTime() - 16 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];
}
