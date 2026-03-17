import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;

/**
 * Client Supabase avec la clé anon (simule un utilisateur normal)
 */
export function createAnonClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

/**
 * Client Supabase avec la service role key (bypass RLS pour vérifications DB)
 */
export function createAdminClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Vérifie qu'un enregistrement existe dans une table
 */
export async function assertRecordExists(
  table: string,
  filters: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const client = createAdminClient();
  let query = client.from(table).select("*");
  for (const [key, value] of Object.entries(filters)) {
    query = query.eq(key, value);
  }
  const { data, error } = await query.single();
  if (error)
    throw new Error(
      `Record not found in ${table}: ${JSON.stringify(filters)} — ${error.message}`,
    );
  return data;
}

/**
 * Vérifie qu'un enregistrement N'existe PAS dans une table
 */
export async function assertRecordNotExists(
  table: string,
  filters: Record<string, unknown>,
): Promise<void> {
  const client = createAdminClient();
  let query = client.from(table).select("id");
  for (const [key, value] of Object.entries(filters)) {
    query = query.eq(key, value);
  }
  const { data } = await query.maybeSingle();
  if (data)
    throw new Error(
      `Record unexpectedly found in ${table}: ${JSON.stringify(filters)}`,
    );
}

/**
 * Compte les enregistrements dans une table avec des filtres
 */
export async function countRecords(
  table: string,
  filters: Record<string, unknown> = {},
): Promise<number> {
  const client = createAdminClient();
  let query = client.from(table).select("id", { count: "exact", head: true });
  for (const [key, value] of Object.entries(filters)) {
    query = query.eq(key, value);
  }
  const { count, error } = await query;
  if (error) throw new Error(`Count failed on ${table}: ${error.message}`);
  return count ?? 0;
}

/**
 * Supprime les données de test créées pendant les tests
 */
export async function cleanupTestData(userIds: string[]): Promise<void> {
  if (userIds.length === 0) return;
  const client = createAdminClient();

  // Supprimer dans l'ordre inverse des dépendances
  const tables = [
    "deal_activities",
    "deals",
    "bookings",
    "community_posts",
    "community_replies",
    "messages",
    "eod_journals",
    "gamification_profiles",
  ];

  for (const table of tables) {
    await client.from(table).delete().in("user_id", userIds);
  }
}
