/**
 * Cleanup runner — supprime les données de test E2E
 * Usage: npx tsx seeds/cleanup-runner.ts
 */
import { resolve } from "path";
import dotenv from "dotenv";

dotenv.config({ path: resolve(__dirname, "../../.env.local") });

function showCleanup() {
  console.log("=== Cleanup E2E Test Data ===");
  console.log("");
  console.log("Pour nettoyer les données de test, exécutez ce SQL :");
  console.log("");

  const cleanupSQL = `
-- Supprimer les deals créés par les comptes E2E
DELETE FROM deals WHERE user_id IN (
  SELECT id FROM profiles WHERE email LIKE '%@demo.com'
);

-- Supprimer les bookings de test
DELETE FROM bookings WHERE user_id IN (
  SELECT id FROM profiles WHERE email LIKE '%@demo.com'
);

-- Supprimer les posts communauté de test
DELETE FROM community_posts WHERE user_id IN (
  SELECT id FROM profiles WHERE email LIKE '%@demo.com'
);

-- Supprimer les messages de test
DELETE FROM messages WHERE user_id IN (
  SELECT id FROM profiles WHERE email LIKE '%@demo.com'
);

-- Supprimer les journaux EOD de test
DELETE FROM eod_journals WHERE user_id IN (
  SELECT id FROM profiles WHERE email LIKE '%@demo.com'
);

-- NE PAS supprimer les profiles/auth.users — ils sont réutilisés entre les runs
`;

  console.log(cleanupSQL);
  console.log(
    "Note : les comptes utilisateurs sont conservés pour les prochains runs.",
  );
}

showCleanup();
