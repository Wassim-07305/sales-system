"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// --- Types ---

export interface ImportValidationError {
  row: number;
  field: string;
  message: string;
}

export interface ValidatedRow {
  [key: string]: string;
}

export interface ValidationResult {
  valid: ValidatedRow[];
  errors: ImportValidationError[];
}

export interface ImportResult {
  imported: number;
  skipped: number;
  errors: number;
}

export interface ImportLog {
  id: string;
  user_id: string;
  type: "contacts" | "deals";
  total_rows: number;
  imported: number;
  skipped: number;
  errors: number;
  file_name: string | null;
  created_at: string;
}

// --- Contact fields definition ---

const CONTACT_FIELDS: Record<string, { label: string; required: boolean; validate?: (v: string) => string | null }> = {
  first_name: {
    label: "Prénom",
    required: false,
  },
  last_name: {
    label: "Nom",
    required: false,
  },
  email: {
    label: "Email",
    required: true,
    validate: (v: string) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(v)) return "Email invalide";
      return null;
    },
  },
  phone: {
    label: "Téléphone",
    required: false,
  },
  company: {
    label: "Entreprise",
    required: false,
  },
  position: {
    label: "Poste",
    required: false,
  },
  source: {
    label: "Source",
    required: false,
  },
  tags: {
    label: "Tags",
    required: false,
  },
  notes: {
    label: "Notes",
    required: false,
  },
};

const DEAL_FIELDS: Record<string, { label: string; required: boolean; validate?: (v: string) => string | null }> = {
  title: {
    label: "Titre",
    required: true,
  },
  value: {
    label: "Valeur",
    required: false,
    validate: (v: string) => {
      if (v && isNaN(Number(v))) return "La valeur doit être un nombre";
      return null;
    },
  },
  source: {
    label: "Source",
    required: false,
  },
  notes: {
    label: "Notes",
    required: false,
  },
  contact_email: {
    label: "Email du contact",
    required: false,
    validate: (v: string) => {
      if (v) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(v)) return "Email invalide";
      }
      return null;
    },
  },
};

// --- Actions ---

export async function validateImportData(
  rows: Record<string, string>[],
  mapping: Record<string, string>,
  type: "contacts" | "deals"
): Promise<ValidationResult> {
  const fields = type === "contacts" ? CONTACT_FIELDS : DEAL_FIELDS;
  const valid: ValidatedRow[] = [];
  const errors: ImportValidationError[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    let rowHasError = false;
    const mappedRow: ValidatedRow = {};

    // Map CSV columns to target fields
    for (const [csvCol, targetField] of Object.entries(mapping)) {
      if (targetField && targetField !== "" && row[csvCol] !== undefined) {
        mappedRow[targetField] = row[csvCol].trim();
      }
    }

    // Check required fields
    for (const [fieldName, fieldDef] of Object.entries(fields)) {
      if (fieldDef.required && (!mappedRow[fieldName] || mappedRow[fieldName] === "")) {
        errors.push({
          row: i + 1,
          field: fieldDef.label,
          message: `${fieldDef.label} est requis`,
        });
        rowHasError = true;
      }

      // Run custom validation
      if (mappedRow[fieldName] && fieldDef.validate) {
        const error = fieldDef.validate(mappedRow[fieldName]);
        if (error) {
          errors.push({ row: i + 1, field: fieldDef.label, message: error });
          rowHasError = true;
        }
      }
    }

    if (!rowHasError) {
      valid.push(mappedRow);
    }
  }

  return { valid, errors };
}

export async function executeImport(
  rows: Record<string, string>[],
  mapping: Record<string, string>,
  type: "contacts" | "deals",
  options: { skipDuplicates: boolean; fileName?: string }
): Promise<ImportResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { imported: 0, skipped: 0, errors: 0 };

  // Validate first
  const { valid } = await validateImportData(rows, mapping, type);

  let imported = 0;
  let skipped = 0;
  let errorCount = rows.length - valid.length; // rows that failed validation

  if (type === "contacts") {
    for (const row of valid) {
      // Duplicate check
      if (options.skipDuplicates && (row.email || row.phone)) {
        let query = supabase.from("contacts").select("id");

        if (row.email) {
          query = query.eq("email", row.email);
        } else if (row.phone) {
          query = query.eq("phone", row.phone);
        }

        const { data: existing } = await query.limit(1);
        if (existing && existing.length > 0) {
          skipped++;
          continue;
        }
      }

      const fullName = [row.first_name, row.last_name].filter(Boolean).join(" ") || null;
      const tags = row.tags
        ? row.tags.split(",").map((t: string) => t.trim()).filter(Boolean)
        : [];

      const { error } = await supabase.from("contacts").insert({
        full_name: fullName,
        email: row.email || null,
        phone: row.phone || null,
        company: row.company || null,
        position: row.position || null,
        source: row.source || null,
        tags,
        notes: row.notes || null,
        created_by: user.id,
      });

      if (error) {
        errorCount++;
      } else {
        imported++;
      }
    }
  } else {
    // Deals import
    for (const row of valid) {
      const { error } = await supabase.from("deals").insert({
        title: row.title,
        value: row.value ? Number(row.value) : 0,
        source: row.source || null,
        notes: row.notes || null,
        assigned_to: user.id,
        tags: [],
        temperature: "cold" as const,
        probability: 0,
      });

      if (error) {
        errorCount++;
      } else {
        imported++;
      }
    }
  }

  // Log the import — handle gracefully if table doesn't exist
  try {
    await supabase.from("import_logs").insert({
      user_id: user.id,
      type,
      total_rows: rows.length,
      imported,
      skipped,
      errors: errorCount,
      file_name: options.fileName || null,
    });
  } catch {
    // Table might not exist — ignore silently
  }

  revalidatePath("/contacts");
  revalidatePath("/crm");

  return { imported, skipped, errors: errorCount };
}

export async function getImportHistory(): Promise<ImportLog[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  try {
    const { data } = await supabase
      .from("import_logs")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    return (data as ImportLog[]) || [];
  } catch {
    // Table might not exist
    return [];
  }
}
