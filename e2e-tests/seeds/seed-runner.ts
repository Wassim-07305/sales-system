/**
 * Seed runner — affiche les instructions pour exécuter le SQL de seeding
 * Usage: npx tsx seeds/seed-runner.ts
 */
import { readFileSync } from "fs";
import { resolve } from "path";
import dotenv from "dotenv";

dotenv.config({ path: resolve(__dirname, "../../.env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

function runSeed() {
  const sqlPath = resolve(__dirname, "seed-e2e-users.sql");
  const sql = readFileSync(sqlPath, "utf-8");

  console.log("=== Seed E2E Users ===");
  console.log("");
  console.log(
    "Pour créer les 20 utilisateurs de test, exécutez le SQL suivant :",
  );
  console.log("");
  console.log("Option 1 — psql :");
  console.log(
    '  source ../../.env.local && psql "$DATABASE_URL" -f seeds/seed-e2e-users.sql',
  );
  console.log("");
  console.log("Option 2 — Supabase SQL Editor :");

  if (SUPABASE_URL) {
    const projectRef = SUPABASE_URL.split("//")[1]?.split(".")[0];
    console.log(`  https://supabase.com/dashboard/project/${projectRef}/sql`);
  } else {
    console.log("  Ouvrez le SQL Editor de votre projet Supabase");
  }

  console.log("");
  console.log("Copiez-collez le contenu du fichier : seeds/seed-e2e-users.sql");
  console.log("");
  console.log(`Fichier SQL : ${sqlPath}`);
  console.log(`Taille : ${sql.length} caractères`);
  console.log("");
  console.log("Utilisateurs créés :");
  console.log("  2 admins, 2 managers, 4 setters, 3 closers, 4 B2B, 5 B2C");
  console.log("  Mot de passe pour tous : demo1234");
}

runSeed();
