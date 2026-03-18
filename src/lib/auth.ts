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
  return { supabase, user };
}
