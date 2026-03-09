"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface QueryFilter {
  column: string;
  operator: "eq" | "gt" | "lt" | "gte" | "lte" | "like" | "neq";
  value: string;
}

export interface QueryConfig {
  table: "deals" | "contacts" | "bookings" | "contracts" | "calls";
  columns: string[];
  filters: QueryFilter[];
  groupBy?: string;
  orderBy?: { column: string; direction: "asc" | "desc" };
  limit?: number;
}

export interface SavedReport {
  id: string;
  name: string;
  config: QueryConfig;
  created_at: string;
  user_id: string;
}

const ALLOWED_TABLES = ["deals", "contacts", "bookings", "contracts", "calls"] as const;

const ALLOWED_COLUMNS: Record<string, string[]> = {
  deals: ["id", "name", "value", "status", "stage", "setter_id", "closer_id", "created_at", "updated_at"],
  contacts: ["id", "first_name", "last_name", "email", "phone", "company", "position", "source", "status", "created_at"],
  bookings: ["id", "prospect_name", "assigned_to", "scheduled_at", "duration_minutes", "status", "created_at"],
  contracts: ["id", "deal_id", "status", "amount", "start_date", "end_date", "created_at"],
  calls: ["id", "contact_id", "user_id", "direction", "duration", "outcome", "notes", "created_at"],
};

const ALLOWED_OPERATORS = ["eq", "gt", "lt", "gte", "lte", "like", "neq"] as const;

function validateConfig(config: QueryConfig): string | null {
  if (!ALLOWED_TABLES.includes(config.table)) {
    return `Table non autorisee: ${config.table}`;
  }

  const tableColumns = ALLOWED_COLUMNS[config.table];
  for (const col of config.columns) {
    if (!tableColumns.includes(col)) {
      return `Colonne non autorisee pour ${config.table}: ${col}`;
    }
  }

  if (config.columns.length === 0) {
    return "Veuillez selectionner au moins une colonne";
  }

  for (const filter of config.filters) {
    if (!tableColumns.includes(filter.column)) {
      return `Colonne de filtre non autorisee: ${filter.column}`;
    }
    if (!ALLOWED_OPERATORS.includes(filter.operator)) {
      return `Operateur non autorise: ${filter.operator}`;
    }
  }

  if (config.orderBy && !tableColumns.includes(config.orderBy.column)) {
    return `Colonne de tri non autorisee: ${config.orderBy.column}`;
  }

  return null;
}

export async function executeCustomQuery(config: QueryConfig): Promise<{
  data: Record<string, unknown>[];
  totalCount: number;
  error?: string;
}> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: [], totalCount: 0, error: "Non authentifie" };

  const validationError = validateConfig(config);
  if (validationError) {
    return { data: [], totalCount: 0, error: validationError };
  }

  const selectColumns = config.columns.join(", ");
  let query = supabase.from(config.table).select(selectColumns, { count: "exact" });

  for (const filter of config.filters) {
    const val = filter.value;
    switch (filter.operator) {
      case "eq":
        query = query.eq(filter.column, val);
        break;
      case "neq":
        query = query.neq(filter.column, val);
        break;
      case "gt":
        query = query.gt(filter.column, val);
        break;
      case "lt":
        query = query.lt(filter.column, val);
        break;
      case "gte":
        query = query.gte(filter.column, val);
        break;
      case "lte":
        query = query.lte(filter.column, val);
        break;
      case "like":
        query = query.ilike(filter.column, `%${val}%`);
        break;
    }
  }

  if (config.orderBy) {
    query = query.order(config.orderBy.column, {
      ascending: config.orderBy.direction === "asc",
    });
  }

  const limit = Math.min(config.limit || 100, 1000);
  query = query.limit(limit);

  const { data, count, error } = await query;

  if (error) {
    return { data: [], totalCount: 0, error: error.message };
  }

  return {
    data: (data || []) as unknown as Record<string, unknown>[],
    totalCount: count || 0,
  };
}

export async function saveReport(
  name: string,
  config: QueryConfig
): Promise<{ id?: string; error?: string; useLocalStorage?: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifie" };

  const { data, error } = await supabase
    .from("saved_reports")
    .insert({
      name,
      config: config as unknown as Record<string, unknown>,
      user_id: user.id,
    })
    .select("id")
    .single();

  if (error) {
    // Table doesn't exist or other DB error — fall back to localStorage
    return { useLocalStorage: true };
  }

  revalidatePath("/analytics/reports");
  return { id: data.id };
}

export async function getSavedReports(): Promise<{
  data: SavedReport[];
  error?: string;
  useLocalStorage?: boolean;
}> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: [], error: "Non authentifie" };

  const { data, error } = await supabase
    .from("saved_reports")
    .select("id, name, config, created_at, user_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    // Table doesn't exist — fall back to localStorage
    return { data: [], useLocalStorage: true };
  }

  return { data: (data || []) as unknown as SavedReport[] };
}

export async function deleteReport(
  id: string
): Promise<{ error?: string; useLocalStorage?: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifie" };

  const { error } = await supabase
    .from("saved_reports")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return { useLocalStorage: true };
  }

  revalidatePath("/analytics/reports");
  return {};
}
