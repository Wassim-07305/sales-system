"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// ---------------------------------------------------------------------------
// CSV helpers
// ---------------------------------------------------------------------------

function parseCSV(csvText: string): string[][] {
  const rows: string[][] = [];
  const lines = csvText.split(/\r?\n/).filter((line) => line.trim() !== "");

  for (const line of lines) {
    const row: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (inQuotes) {
        if (char === '"') {
          if (i + 1 < line.length && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          current += char;
        }
      } else {
        if (char === '"') {
          inQuotes = true;
        } else if (char === ",") {
          row.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
    }
    row.push(current.trim());
    rows.push(row);
  }

  return rows;
}

function rowsToObjects(rows: string[][]): Record<string, string>[] {
  if (rows.length < 2) return [];
  const headers = rows[0].map((h) => h.toLowerCase().replace(/\s+/g, "_"));
  return rows.slice(1).map((row) => {
    const obj: Record<string, string> = {};
    headers.forEach((header, i) => {
      obj[header] = row[i] ?? "";
    });
    return obj;
  });
}

function escapeCSVField(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function toCSV(headers: string[], rows: string[][]): string {
  const headerLine = headers.map(escapeCSVField).join(",");
  const dataLines = rows.map((row) => row.map(escapeCSVField).join(","));
  return [headerLine, ...dataLines].join("\n");
}

// ---------------------------------------------------------------------------
// Import Contacts
// ---------------------------------------------------------------------------

export async function importContactsCSV(
  csvText: string
): Promise<{ imported: number; errors: string[] }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { imported: 0, errors: ["Non authentifié"] };

  const rows = parseCSV(csvText);
  const objects = rowsToObjects(rows);

  if (objects.length === 0) {
    return { imported: 0, errors: ["Aucune donnée trouvée dans le CSV"] };
  }

  let imported = 0;
  const errors: string[] = [];
  const validRoles = [
    "admin",
    "manager",
    "setter",
    "closer",
    "client_b2b",
    "client_b2c",
  ];

  for (let i = 0; i < objects.length; i++) {
    const row = objects[i];
    const lineNum = i + 2; // +2 because header is line 1

    if (!row.email) {
      errors.push(`Ligne ${lineNum}: email manquant`);
      continue;
    }

    const role = row.role && validRoles.includes(row.role) ? row.role : "client_b2b";

    const { error } = await supabase.from("profiles").upsert(
      {
        email: row.email,
        full_name: row.full_name || null,
        phone: row.phone || null,
        company: row.company || null,
        role,
        niche: row.niche || null,
      },
      { onConflict: "email" }
    );

    if (error) {
      errors.push(`Ligne ${lineNum}: ${error.message}`);
    } else {
      imported++;
    }
  }

  revalidatePath("/contacts");
  return { imported, errors };
}

// ---------------------------------------------------------------------------
// Import Deals
// ---------------------------------------------------------------------------

export async function importDealsCSV(
  csvText: string
): Promise<{ imported: number; errors: string[] }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { imported: 0, errors: ["Non authentifié"] };

  const rows = parseCSV(csvText);
  const objects = rowsToObjects(rows);

  if (objects.length === 0) {
    return { imported: 0, errors: ["Aucune donnée trouvée dans le CSV"] };
  }

  let imported = 0;
  const errors: string[] = [];
  const validTemperatures = ["hot", "warm", "cold"];

  for (let i = 0; i < objects.length; i++) {
    const row = objects[i];
    const lineNum = i + 2;

    if (!row.title) {
      errors.push(`Ligne ${lineNum}: titre manquant`);
      continue;
    }

    // Lookup contact_id from email
    let contactId: string | null = null;
    if (row.contact_email) {
      const { data: contact } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", row.contact_email)
        .single();
      if (contact) {
        contactId = contact.id;
      } else {
        errors.push(
          `Ligne ${lineNum}: contact "${row.contact_email}" non trouvé`
        );
      }
    }

    const temperature =
      row.temperature && validTemperatures.includes(row.temperature)
        ? row.temperature
        : "warm";

    const { error } = await supabase.from("deals").insert({
      title: row.title,
      value: parseFloat(row.value) || 0,
      source: row.source || null,
      contact_id: contactId,
      temperature,
      assigned_to: user.id,
    });

    if (error) {
      errors.push(`Ligne ${lineNum}: ${error.message}`);
    } else {
      imported++;
    }
  }

  revalidatePath("/crm");
  return { imported, errors };
}

// ---------------------------------------------------------------------------
// Export Contacts
// ---------------------------------------------------------------------------

export async function exportContactsCSV(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "";

  const { data: profiles } = await supabase
    .from("profiles")
    .select("full_name, email, phone, company, role, niche, health_score, created_at")
    .order("created_at", { ascending: false });

  if (!profiles || profiles.length === 0) return "";

  const headers = [
    "full_name",
    "email",
    "phone",
    "company",
    "role",
    "niche",
    "health_score",
    "created_at",
  ];

  const rows = profiles.map((p) => [
    p.full_name || "",
    p.email || "",
    p.phone || "",
    p.company || "",
    p.role || "",
    p.niche || "",
    String(p.health_score ?? ""),
    p.created_at || "",
  ]);

  return toCSV(headers, rows);
}

// ---------------------------------------------------------------------------
// Export Deals
// ---------------------------------------------------------------------------

export async function exportDealsCSV(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "";

  const { data: deals } = await supabase
    .from("deals")
    .select("title, value, source, temperature, created_at, stage:pipeline_stages(name), contact:profiles!contact_id(full_name)")
    .order("created_at", { ascending: false });

  if (!deals || deals.length === 0) return "";

  const headers = [
    "title",
    "value",
    "source",
    "stage",
    "contact_name",
    "temperature",
    "created_at",
  ];

  const rows = deals.map((d: Record<string, unknown>) => {
    const stage = d.stage as { name: string } | null;
    const contact = d.contact as { full_name: string | null } | null;
    return [
      String(d.title || ""),
      String(d.value ?? ""),
      String(d.source || ""),
      stage?.name || "",
      contact?.full_name || "",
      String(d.temperature || ""),
      String(d.created_at || ""),
    ];
  });

  return toCSV(headers, rows);
}
