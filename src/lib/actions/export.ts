"use server";

import { createClient } from "@/lib/supabase/server";

export type ExportType = "contacts" | "deals" | "bookings" | "contracts";

export interface ExportColumn {
  key: string;
  label: string;
}

export interface ExportFilters {
  dateFrom?: string;
  dateTo?: string;
  status?: string;
}

// ---------------------------------------------------------------------------
// Column definitions per export type
// ---------------------------------------------------------------------------

const COLUMNS: Record<ExportType, ExportColumn[]> = {
  contacts: [
    { key: "full_name", label: "Nom complet" },
    { key: "email", label: "Email" },
    { key: "phone", label: "Téléphone" },
    { key: "company", label: "Entreprise" },
    { key: "role", label: "Rôle" },
    { key: "niche", label: "Niche" },
    { key: "current_revenue", label: "Revenu actuel" },
    { key: "health_score", label: "Score santé" },
    { key: "subscription_tier", label: "Abonnement" },
    { key: "created_at", label: "Date de création" },
  ],
  deals: [
    { key: "title", label: "Titre" },
    { key: "value", label: "Valeur" },
    { key: "probability", label: "Probabilité (%)" },
    { key: "source", label: "Source" },
    { key: "temperature", label: "Température" },
    { key: "tags", label: "Tags" },
    { key: "notes", label: "Notes" },
    { key: "next_action", label: "Prochaine action" },
    { key: "next_action_date", label: "Date prochaine action" },
    { key: "last_contact_at", label: "Dernier contact" },
    { key: "created_at", label: "Date de création" },
    { key: "updated_at", label: "Dernière mise à jour" },
  ],
  bookings: [
    { key: "prospect_name", label: "Nom prospect" },
    { key: "prospect_email", label: "Email prospect" },
    { key: "prospect_phone", label: "Téléphone prospect" },
    { key: "slot_type", label: "Type de créneau" },
    { key: "scheduled_at", label: "Date planifiée" },
    { key: "duration_minutes", label: "Durée (min)" },
    { key: "status", label: "Statut" },
    { key: "notes", label: "Notes" },
    { key: "reliability_score", label: "Score fiabilité" },
    { key: "created_at", label: "Date de création" },
  ],
  contracts: [
    { key: "content", label: "Contenu" },
    { key: "amount", label: "Montant" },
    { key: "status", label: "Statut" },
    { key: "payment_schedule", label: "Échéancier" },
    { key: "installment_count", label: "Nombre échéances" },
    { key: "signed_at", label: "Date de signature" },
    { key: "auto_generated", label: "Auto-généré" },
    { key: "created_at", label: "Date de création" },
  ],
};

const TABLE_MAP: Record<ExportType, string> = {
  contacts: "profiles",
  deals: "deals",
  bookings: "bookings",
  contracts: "contracts",
};

const DATE_FIELD_MAP: Record<ExportType, string> = {
  contacts: "created_at",
  deals: "created_at",
  bookings: "scheduled_at",
  contracts: "created_at",
};

const STATUS_FIELD_MAP: Record<ExportType, string | null> = {
  contacts: "role",
  deals: "temperature",
  bookings: "status",
  contracts: "status",
};

// ---------------------------------------------------------------------------
// getExportColumns
// ---------------------------------------------------------------------------

export async function getExportColumns(type: string): Promise<ExportColumn[]> {
  const exportType = type as ExportType;
  return COLUMNS[exportType] || [];
}

// ---------------------------------------------------------------------------
// getExportableData
// ---------------------------------------------------------------------------

export async function getExportableData(
  type: ExportType,
  filters?: ExportFilters
): Promise<Record<string, unknown>[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const table = TABLE_MAP[type];
  const dateField = DATE_FIELD_MAP[type];
  const statusField = STATUS_FIELD_MAP[type];

  let query = supabase.from(table).select("*");

  if (filters?.dateFrom) {
    query = query.gte(dateField, filters.dateFrom);
  }
  if (filters?.dateTo) {
    // Add end-of-day to include the full day
    query = query.lte(dateField, `${filters.dateTo}T23:59:59`);
  }
  if (filters?.status && statusField) {
    query = query.eq(statusField, filters.status);
  }

  query = query.order("created_at", { ascending: false });

  const { data, error } = await query;

  if (error) {
    console.error("Export query error:", error);
    return [];
  }

  return (data as Record<string, unknown>[]) || [];
}
