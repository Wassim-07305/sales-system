"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface BusinessWithSetters {
  id: string;
  full_name: string | null;
  email: string;
  company: string | null;
  avatar_url: string | null;
  setters: {
    id: string;
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  }[];
}

export interface SetterProfile {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
}

export interface BusinessProfile {
  id: string;
  full_name: string | null;
  email: string;
  company: string | null;
  avatar_url: string | null;
}

/**
 * Récupère tous les profils B2B avec leurs setters B2C liés.
 */
export async function getAssignments(): Promise<BusinessWithSetters[]> {
  const supabase = await createClient();

  // Récupérer tous les profils B2B
  const { data: businesses } = await supabase
    .from("profiles")
    .select("id, full_name, email, company, avatar_url")
    .eq("role", "client_b2b")
    .order("full_name");

  if (!businesses || businesses.length === 0) return [];

  // Récupérer tous les setters B2C qui ont un matched_entrepreneur_id
  const { data: allSetters } = await supabase
    .from("profiles")
    .select("id, full_name, email, avatar_url, matched_entrepreneur_id")
    .eq("role", "client_b2c")
    .not("matched_entrepreneur_id", "is", null);

  const settersByBusiness = new Map<string, SetterProfile[]>();
  if (allSetters) {
    for (const setter of allSetters) {
      const bizId = setter.matched_entrepreneur_id as string;
      if (!settersByBusiness.has(bizId)) {
        settersByBusiness.set(bizId, []);
      }
      settersByBusiness.get(bizId)!.push({
        id: setter.id,
        full_name: setter.full_name,
        email: setter.email,
        avatar_url: setter.avatar_url,
      });
    }
  }

  return businesses.map((biz) => ({
    id: biz.id,
    full_name: biz.full_name,
    email: biz.email,
    company: biz.company,
    avatar_url: biz.avatar_url,
    setters: settersByBusiness.get(biz.id) || [],
  }));
}

/**
 * Affecter un setter B2C à un business B2B.
 */
export async function assignSetter(setterId: string, businessId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  // Vérifier que l'appelant est admin ou manager
  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!callerProfile || !["admin", "manager"].includes(callerProfile.role)) {
    throw new Error("Accès refusé : rôle admin ou manager requis");
  }

  const { error } = await supabase
    .from("profiles")
    .update({ matched_entrepreneur_id: businessId })
    .eq("id", setterId);

  if (error) throw new Error(error.message);
  revalidatePath("/team/assignments");
}

/**
 * Désaffecter un setter B2C (retirer le lien avec le business).
 */
export async function unassignSetter(setterId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  // Vérifier que l'appelant est admin ou manager
  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!callerProfile || !["admin", "manager"].includes(callerProfile.role)) {
    throw new Error("Accès refusé : rôle admin ou manager requis");
  }

  const { error } = await supabase
    .from("profiles")
    .update({ matched_entrepreneur_id: null })
    .eq("id", setterId);

  if (error) throw new Error(error.message);
  revalidatePath("/team/assignments");
}

/**
 * Récupérer les setters B2C non affectés.
 */
export async function getUnassignedSetters(): Promise<SetterProfile[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, email, avatar_url")
    .eq("role", "client_b2c")
    .is("matched_entrepreneur_id", null)
    .order("full_name");

  return (data || []).map((s) => ({
    id: s.id,
    full_name: s.full_name,
    email: s.email,
    avatar_url: s.avatar_url,
  }));
}

/**
 * Récupérer tous les profils B2B.
 */
export async function getBusinesses(): Promise<BusinessProfile[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, email, company, avatar_url")
    .eq("role", "client_b2b")
    .order("full_name");

  return (data || []).map((b) => ({
    id: b.id,
    full_name: b.full_name,
    email: b.email,
    company: b.company,
    avatar_url: b.avatar_url,
  }));
}
