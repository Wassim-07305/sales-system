"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface QueryFilter {
  column: string;
  operator: "eq" | "gt" | "lt" | "gte" | "lte" | "like" | "neq";
  value: string;
}

export interface AggregationConfig {
  function: "count" | "sum" | "avg" | "min" | "max";
  column: string;
}

export interface QueryConfig {
  table: "deals" | "contacts" | "bookings" | "contracts" | "calls";
  columns: string[];
  filters: QueryFilter[];
  aggregation?: AggregationConfig;
  groupBy?: string[];
  orderBy?: { column: string; direction: "asc" | "desc" };
  limit?: number;
}

export interface SavedReport {
  id: string;
  name: string;
  config: QueryConfig;
  created_at: string;
  user_id: string;
  last_run_at?: string;
  last_result_count?: number;
}

const ALLOWED_TABLES = [
  "deals",
  "contacts",
  "bookings",
  "contracts",
  "calls",
] as const;

const ALLOWED_COLUMNS: Record<string, string[]> = {
  deals: [
    "id",
    "name",
    "value",
    "status",
    "stage",
    "setter_id",
    "closer_id",
    "created_at",
    "updated_at",
  ],
  contacts: [
    "id",
    "first_name",
    "last_name",
    "email",
    "phone",
    "company",
    "position",
    "source",
    "status",
    "created_at",
  ],
  bookings: [
    "id",
    "prospect_name",
    "assigned_to",
    "scheduled_at",
    "duration_minutes",
    "status",
    "created_at",
  ],
  contracts: [
    "id",
    "deal_id",
    "status",
    "amount",
    "start_date",
    "end_date",
    "created_at",
  ],
  calls: [
    "id",
    "contact_id",
    "user_id",
    "direction",
    "duration",
    "outcome",
    "notes",
    "created_at",
  ],
};

const ALLOWED_OPERATORS = [
  "eq",
  "gt",
  "lt",
  "gte",
  "lte",
  "like",
  "neq",
] as const;

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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: [], totalCount: 0, error: "Non authentifie" };

  const validationError = validateConfig(config);
  if (validationError) {
    return { data: [], totalCount: 0, error: validationError };
  }

  const selectColumns = config.columns.join(", ");
  let query = supabase
    .from(config.table)
    .select(selectColumns, { count: "exact" });

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
  config: QueryConfig,
): Promise<{ id?: string; error?: string; useLocalStorage?: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
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
  const {
    data: { user },
  } = await supabase.auth.getUser();
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
  id: string,
): Promise<{ error?: string; useLocalStorage?: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
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

// ─── F68: Rapport Mensuel Automatisé B2B (PDF) ─────────────────────

export async function generateMonthlyB2BReport(
  clientId: string,
  month?: string,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const targetMonth = month || new Date().toISOString().slice(0, 7); // YYYY-MM
  const startDate = `${targetMonth}-01`;
  const endDate = new Date(
    new Date(startDate).setMonth(new Date(startDate).getMonth() + 1),
  )
    .toISOString()
    .split("T")[0];

  // Get client profile
  const { data: client } = await supabase
    .from("profiles")
    .select("full_name, email, company")
    .eq("id", clientId)
    .single();

  // Get deals for this client's pipeline in the period
  const { data: deals } = await supabase
    .from("deals")
    .select("id, title, value, stage_id, created_at, closed_at")
    .eq("contact_id", clientId)
    .gte("created_at", startDate)
    .lt("created_at", endDate);

  // Get bookings
  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, status, scheduled_at")
    .eq("contact_id", clientId)
    .gte("scheduled_at", startDate)
    .lt("scheduled_at", endDate);

  // Get conversations / DMs
  const { data: conversations } = await supabase
    .from("dm_conversations")
    .select("id, messages, platform")
    .eq("prospect_id", clientId);

  const totalDeals = (deals || []).length;
  const closedDeals = (deals || []).filter((d) => d.closed_at).length;
  const totalRevenue = (deals || [])
    .filter((d) => d.closed_at)
    .reduce((s, d) => s + (d.value || 0), 0);
  const totalBookings = (bookings || []).length;
  const completedBookings = (bookings || []).filter(
    (b) => b.status === "completed",
  ).length;
  const totalMessages = (conversations || []).reduce(
    (s, c) => s + ((c.messages as unknown[]) || []).length,
    0,
  );

  const report = {
    clientName: client?.full_name || "Client",
    clientCompany: client?.company || "",
    period: targetMonth,
    generatedAt: new Date().toISOString(),
    metrics: {
      totalDeals,
      closedDeals,
      totalRevenue,
      conversionRate:
        totalDeals > 0 ? Math.round((closedDeals / totalDeals) * 100) : 0,
      totalBookings,
      completedBookings,
      showUpRate:
        totalBookings > 0
          ? Math.round((completedBookings / totalBookings) * 100)
          : 0,
      totalMessages,
    },
    recommendations: [
      totalRevenue === 0
        ? "Augmenter le volume de conversations pour générer plus d'opportunités"
        : null,
      completedBookings < totalBookings * 0.7
        ? "Améliorer le taux de show-up avec des rappels J-1 et H-2"
        : null,
      closedDeals < totalDeals * 0.3
        ? "Retravailler le script de closing — le taux de conversion est inférieur à 30%"
        : null,
    ].filter(Boolean),
  };

  // Store the report
  const { error } = await supabase.from("monthly_reports").upsert(
    {
      client_id: clientId,
      period: targetMonth,
      report_data: report,
      generated_by: user.id,
    },
    { onConflict: "client_id,period" },
  );

  if (error) return { error: error.message };

  revalidatePath("/portal/reports");
  return { report };
}

export async function getMonthlyReports(clientId?: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  let query = supabase
    .from("monthly_reports")
    .select("*, client:profiles!client_id(full_name, company)")
    .order("period", { ascending: false })
    .limit(12);

  if (clientId) {
    query = query.eq("client_id", clientId);
  }

  const { data } = await query;
  return data || [];
}

// ─── F53: Rapport Performance Setter Hebdomadaire Auto ──────────────

export async function generateWeeklySetterReport(setterId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const startDate = weekAgo.toISOString();

  // Get setter profile
  const { data: setter } = await supabase
    .from("profiles")
    .select("full_name, email, role")
    .eq("id", setterId)
    .single();

  // Daily journals this week
  const { data: journals } = await supabase
    .from("daily_journals")
    .select("*")
    .eq("user_id", setterId)
    .gte("date", weekAgo.toISOString().split("T")[0])
    .order("date", { ascending: true });

  // Deals created/updated this week
  const { data: deals } = await supabase
    .from("deals")
    .select("id, value, stage_id, created_at")
    .eq("assigned_to", setterId)
    .gte("created_at", startDate);

  const totalDms = (journals || []).reduce((s, j) => s + (j.dms_sent || 0), 0);
  const totalReplies = (journals || []).reduce(
    (s, j) => s + (j.replies_received || 0),
    0,
  );
  const totalCallsBooked = (journals || []).reduce(
    (s, j) => s + (j.calls_booked || 0),
    0,
  );
  const totalCallsDone = (journals || []).reduce(
    (s, j) => s + (j.calls_completed || 0),
    0,
  );
  const totalRevenue = (journals || []).reduce(
    (s, j) => s + (j.revenue_generated || 0),
    0,
  );
  const eodSubmitted = (journals || []).length;

  return {
    report: {
      setterName: setter?.full_name || "Setter",
      period: `${weekAgo.toISOString().split("T")[0]} — ${now.toISOString().split("T")[0]}`,
      metrics: {
        dmsSent: totalDms,
        repliesReceived: totalReplies,
        responseRate:
          totalDms > 0 ? Math.round((totalReplies / totalDms) * 100) : 0,
        callsBooked: totalCallsBooked,
        callsCompleted: totalCallsDone,
        showUpRate:
          totalCallsBooked > 0
            ? Math.round((totalCallsDone / totalCallsBooked) * 100)
            : 0,
        revenue: totalRevenue,
        newDeals: (deals || []).length,
        eodCompliance: `${eodSubmitted}/7`,
      },
    },
  };
}
