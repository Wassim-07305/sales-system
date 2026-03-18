"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Creates a new entrepreneur (client_b2b) account.
 * Uses Supabase Auth invite which sends a magic link email.
 */
export async function createEntrepreneurAccount(data: {
  email: string;
  fullName?: string;
  company?: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  // Check admin role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "manager"].includes(profile.role)) {
    return { error: "Action réservée aux administrateurs" };
  }

  // Check if email already exists
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", data.email)
    .maybeSingle();

  if (existing) {
    return { error: "Un compte avec cet email existe déjà" };
  }

  // Use Supabase Auth to invite user (sends magic link email)
  const { data: inviteData, error: inviteError } =
    await supabase.auth.admin.inviteUserByEmail(data.email, {
      data: {
        full_name: data.fullName || null,
        company: data.company || null,
        role: "client_b2b",
      },
    });

  if (inviteError) {
    // Fallback: try signUp with auto-confirm if admin invite not available
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp(
      {
        email: data.email,
        password: crypto.randomUUID(), // Random password — user will reset via email
        options: {
          data: {
            full_name: data.fullName || null,
            company: data.company || null,
          },
        },
      },
    );

    if (signUpError) {
      return { error: `Erreur: ${signUpError.message}` };
    }

    if (signUpData.user) {
      // Update profile with B2B role
      await supabase
        .from("profiles")
        .update({
          role: "client_b2b",
          full_name: data.fullName || null,
          company: data.company || null,
          onboarding_completed: false,
          onboarding_step: 0,
        })
        .eq("id", signUpData.user.id);
    }

    revalidatePath("/settings/workspaces");
    return { success: true, userId: signUpData.user?.id };
  }

  // Update the profile created by the trigger
  if (inviteData.user) {
    await supabase
      .from("profiles")
      .update({
        role: "client_b2b",
        full_name: data.fullName || null,
        company: data.company || null,
        onboarding_completed: false,
        onboarding_step: 0,
      })
      .eq("id", inviteData.user.id);
  }

  revalidatePath("/settings/workspaces");
  return { success: true, userId: inviteData.user?.id };
}

/**
 * Get all B2B workspaces with their setters, deals, and contract stats.
 * Used for the admin global B2B view.
 */
export async function getB2BWorkspaceOverview() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié", data: [] };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "manager"].includes(profile.role)) {
    return { error: "Accès refusé", data: [] };
  }

  // All B2B entrepreneurs
  const { data: entrepreneurs } = await supabase
    .from("profiles")
    .select("id, full_name, email, company, onboarding_completed, created_at")
    .eq("role", "client_b2b")
    .order("created_at", { ascending: false });

  // All assigned setters
  const { data: setters } = await supabase
    .from("profiles")
    .select("id, full_name, email, matched_entrepreneur_id")
    .eq("role", "client_b2c")
    .not("matched_entrepreneur_id", "is", null);

  // Build workspace data
  const setterMap: Record<string, typeof setters> = {};
  for (const s of setters || []) {
    const eid = s.matched_entrepreneur_id as string;
    if (!setterMap[eid]) setterMap[eid] = [];
    setterMap[eid].push(s);
  }

  const workspaceData = (entrepreneurs || []).map((e) => ({
    ...e,
    setters: setterMap[e.id] || [],
    setterCount: (setterMap[e.id] || []).length,
  }));

  return { error: null, data: workspaceData };
}
