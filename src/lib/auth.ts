"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Crée un client Supabase authentifié et retourne le user.
 * Throw si non authentifié (les server actions attrapent l'erreur).
 */
export async function requireAuth() {
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

  return { supabase, user, profile: profile || { role: "client_b2c" } };
}
