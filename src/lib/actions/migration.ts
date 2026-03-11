"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  CRM_PRESETS,
  type CrmSource,
  type MigrationConfig,
  type MigrationResult,
  type MigrationLog,
} from "@/lib/migration-presets";

// ---------- Stage mapping helper ----------

const STAGE_MAP: Record<string, string> = {
  // HubSpot stages
  "appointmentscheduled": "Prospect",
  "qualifiedtobuy": "Contacte",
  "presentationscheduled": "Appel Decouverte",
  "decisionmakerboughtin": "Proposition",
  "contractsent": "Closing",
  "closedwon": "Client Signé",
  "closedlost": "Perdu",
  // Pipedrive stages (French)
  "contact": "Contacte",
  "contacté": "Contacte",
  "découverte": "Appel Decouverte",
  "proposition": "Proposition",
  "négociation": "Closing",
  "gagné": "Client Signé",
  "perdu": "Perdu",
  // Salesforce stages
  "prospecting": "Prospect",
  "qualification": "Contacte",
  "needs analysis": "Appel Decouverte",
  "proposal/price quote": "Proposition",
  "negotiation/review": "Closing",
  "closed won": "Client Signé",
  "closed lost": "Perdu",
  // Generic
  "nouveau": "Prospect",
  "new": "Prospect",
  "prospect": "Prospect",
  "lead": "Prospect",
  "qualified": "Contacte",
  "demo": "Appel Decouverte",
  "proposal": "Proposition",
  "closing": "Closing",
  "won": "Client Signé",
  "lost": "Perdu",
};

function mapStageName(input: string): string {
  const normalized = input.toLowerCase().trim();
  return STAGE_MAP[normalized] || "Prospect";
}

// ---------- Transform helpers ----------

function transformValue(value: string, transform?: string): string {
  if (!value || !transform) return value;

  switch (transform) {
    case "number":
      return String(parseFloat(value.replace(/[^\d.,\-]/g, "").replace(",", ".")) || 0);
    case "date": {
      const d = new Date(value);
      return isNaN(d.getTime()) ? "" : d.toISOString();
    }
    case "tags":
      return value;
    case "stage":
      return mapStageName(value);
    default:
      return value;
  }
}

// ---------- Execute Migration ----------

export async function executeMigration(
  contactRows: Record<string, string>[],
  dealRows: Record<string, string>[],
  config: MigrationConfig,
  fileName?: string
): Promise<MigrationResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const result: MigrationResult = {
    contactsImported: 0,
    contactsSkipped: 0,
    contactsErrors: 0,
    dealsImported: 0,
    dealsSkipped: 0,
    dealsErrors: 0,
    errors: [],
  };

  // Get pipeline stages for deal mapping
  const { data: stages } = await supabase
    .from("pipeline_stages")
    .select("id, name")
    .order("position");

  const stageByName = new Map<string, string>();
  (stages || []).forEach((s) => stageByName.set(s.name, s.id));
  const defaultStageId = stageByName.get(config.options.defaultStage || "Prospect")
    || stages?.[0]?.id || "";

  // Build mapping lookup
  const contactMap = new Map<string, { target: string; transform?: string }>();
  const dealMap = new Map<string, { target: string; transform?: string }>();

  for (const m of config.mappings) {
    if (m.target === "_ignore") continue;
    const preset = CRM_PRESETS[config.source];
    const isContactMapping = preset.contactMappings.some((cm) => cm.source === m.source);
    if (isContactMapping) {
      contactMap.set(m.source, { target: m.target, transform: m.transform });
    } else {
      dealMap.set(m.source, { target: m.target, transform: m.transform });
    }
  }

  // --- Import Contacts ---
  if (config.dataType === "contacts" || config.dataType === "both") {
    for (let i = 0; i < contactRows.length; i++) {
      const row = contactRows[i];
      const mapped: Record<string, string> = {};

      for (const [csvCol, val] of Object.entries(row)) {
        const mapping = contactMap.get(csvCol);
        if (mapping && mapping.target !== "_ignore") {
          mapped[mapping.target] = transformValue(val, mapping.transform);
        }
      }

      if (!mapped.email && !mapped.first_name && !mapped.last_name) {
        result.contactsErrors++;
        result.errors.push({ row: i + 1, message: "Contact sans email ni nom" });
        continue;
      }

      if (config.options.skipDuplicates && mapped.email) {
        const { data: existing } = await supabase
          .from("contacts")
          .select("id")
          .eq("email", mapped.email)
          .limit(1);

        if (existing && existing.length > 0) {
          if (config.options.mergeExisting) {
            await supabase
              .from("contacts")
              .update({
                full_name: [mapped.first_name, mapped.last_name].filter(Boolean).join(" ") || undefined,
                phone: mapped.phone || undefined,
                company: mapped.company || undefined,
                position: mapped.position || undefined,
                source: mapped.source || undefined,
                notes: mapped.notes || undefined,
              })
              .eq("email", mapped.email);
            result.contactsImported++;
          } else {
            result.contactsSkipped++;
          }
          continue;
        }
      }

      const fullName = [mapped.first_name, mapped.last_name].filter(Boolean).join(" ") || null;
      const tags = mapped.tags
        ? mapped.tags.split(",").map((t: string) => t.trim()).filter(Boolean)
        : [];

      const { error } = await supabase.from("contacts").insert({
        full_name: fullName,
        email: mapped.email || null,
        phone: mapped.phone || null,
        company: mapped.company || null,
        position: mapped.position || null,
        source: mapped.source || `Migration ${CRM_PRESETS[config.source].label}`,
        tags,
        notes: mapped.notes || null,
        created_by: user.id,
      });

      if (error) {
        result.contactsErrors++;
        result.errors.push({ row: i + 1, message: error.message });
      } else {
        result.contactsImported++;
      }
    }
  }

  // --- Import Deals ---
  if (config.dataType === "deals" || config.dataType === "both") {
    for (let i = 0; i < dealRows.length; i++) {
      const row = dealRows[i];
      const mapped: Record<string, string> = {};

      for (const [csvCol, val] of Object.entries(row)) {
        const mapping = dealMap.get(csvCol);
        if (mapping && mapping.target !== "_ignore") {
          mapped[mapping.target] = transformValue(val, mapping.transform);
        }
      }

      if (!mapped.title) {
        result.dealsErrors++;
        result.errors.push({ row: i + 1, message: "Deal sans titre" });
        continue;
      }

      const stageId = mapped.stage_name
        ? stageByName.get(mapped.stage_name) || defaultStageId
        : defaultStageId;

      let contactId: string | null = null;
      if (mapped.contact_email) {
        const { data: contact } = await supabase
          .from("contacts")
          .select("id")
          .eq("email", mapped.contact_email)
          .limit(1)
          .single();
        contactId = contact?.id || null;
      }

      const { error } = await supabase.from("deals").insert({
        title: mapped.title,
        value: mapped.value ? Number(mapped.value) : 0,
        stage_id: stageId,
        source: mapped.source || `Migration ${CRM_PRESETS[config.source].label}`,
        notes: mapped.notes || null,
        contact_id: contactId,
        assigned_to: user.id,
        tags: [],
        temperature: "cold" as const,
        probability: 0,
        next_action_date: mapped.next_action_date || null,
      });

      if (error) {
        result.dealsErrors++;
        result.errors.push({ row: i + 1, message: error.message });
      } else {
        result.dealsImported++;
      }
    }
  }

  // Log migration
  try {
    await supabase.from("import_logs").insert({
      user_id: user.id,
      type: config.dataType === "both" ? "contacts" : config.dataType,
      total_rows: contactRows.length + dealRows.length,
      imported: result.contactsImported + result.dealsImported,
      skipped: result.contactsSkipped + result.dealsSkipped,
      errors: result.contactsErrors + result.dealsErrors,
      file_name: fileName ? `[${CRM_PRESETS[config.source].label}] ${fileName}` : null,
    });
  } catch {
    // Table might not exist
  }

  revalidatePath("/contacts");
  revalidatePath("/crm");

  return result;
}

export async function getMigrationHistory(): Promise<MigrationLog[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  try {
    const { data } = await supabase
      .from("import_logs")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    return ((data || []) as unknown as MigrationLog[]).map((d) => ({
      ...d,
      source: (d.file_name?.startsWith("[HubSpot]") ? "hubspot"
        : d.file_name?.startsWith("[Pipedrive]") ? "pipedrive"
        : d.file_name?.startsWith("[Salesforce]") ? "salesforce"
        : "custom") as CrmSource,
      contacts_imported: d.contacts_imported ?? (d as unknown as { imported?: number }).imported ?? 0,
      deals_imported: d.deals_imported ?? 0,
      total_errors: d.total_errors ?? (d as unknown as { errors?: number }).errors ?? 0,
    }));
  } catch {
    return [];
  }
}
