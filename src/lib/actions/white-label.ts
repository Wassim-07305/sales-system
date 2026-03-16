"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const ALL_MODULES = [
  "dashboard",
  "crm",
  "academy",
  "prospection",
  "roleplay",
  "scripts",
  "whatsapp",
  "analytics",
  "chat",
  "communaute",
  "defis",
  "contrats",
];

// Default config returned when the table doesn't exist yet
function getDefaultConfig(userId: string) {
  return {
    id: "default",
    entrepreneur_id: userId,
    brand_name: null,
    app_name: null,
    logo_url: null,
    primary_color: "#7af17a",
    secondary_color: "#14080e",
    custom_domain: null,
    enabled_modules: ALL_MODULES,
    is_active: false,
    created_at: new Date().toISOString(),
  };
}

export async function getWhiteLabelConfig() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  try {
    const { data: existing, error: selectError } = await supabase
      .from("white_label_configs")
      .select("*")
      .eq("entrepreneur_id", user.id)
      .single();

    // If table doesn't exist or other DB error, return default
    if (selectError && selectError.code === "PGRST116") {
      // No rows found — create one
    } else if (selectError) {
      // Table might not exist (42P01) or other error
      console.warn("White label config fetch error:", selectError.message);
      return getDefaultConfig(user.id);
    }

    if (existing) return existing;

    // Create default config
    const { data: newConfig, error: insertError } = await supabase
      .from("white_label_configs")
      .insert({
        entrepreneur_id: user.id,
        primary_color: "#7af17a",
        secondary_color: "#14080e",
        enabled_modules: ALL_MODULES,
        is_active: false,
      })
      .select()
      .single();

    if (insertError) {
      console.warn("White label config insert error:", insertError.message);
      return getDefaultConfig(user.id);
    }

    return newConfig;
  } catch {
    return getDefaultConfig(user.id);
  }
}

export async function saveWhiteLabelConfig(data: {
  brandName?: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  customDomain?: string;
  enabledModules?: string[];
  isActive?: boolean;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const updateData: Record<string, unknown> = {};
  if (data.brandName !== undefined) updateData.brand_name = data.brandName;
  if (data.logoUrl !== undefined) updateData.logo_url = data.logoUrl;
  if (data.primaryColor !== undefined)
    updateData.primary_color = data.primaryColor;
  if (data.secondaryColor !== undefined)
    updateData.secondary_color = data.secondaryColor;
  if (data.customDomain !== undefined)
    updateData.custom_domain = data.customDomain;
  if (data.enabledModules !== undefined)
    updateData.enabled_modules = data.enabledModules;
  if (data.isActive !== undefined) updateData.is_active = data.isActive;

  try {
    const { error } = await supabase
      .from("white_label_configs")
      .update(updateData)
      .eq("entrepreneur_id", user.id);

    if (error) return { error: error.message };
  } catch {
    return {
      error: "La table white_label_configs n'est pas encore configurée",
    };
  }

  revalidatePath("/settings/white-label");
  return { success: true };
}

/** Update branding config (logo_url, primary_color, app_name, custom_domain) */
export async function updateWhiteLabelConfig(data: {
  appName?: string;
  brandName?: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  customDomain?: string;
  isActive?: boolean;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const updateData: Record<string, unknown> = {};
  if (data.appName !== undefined) updateData.app_name = data.appName;
  if (data.brandName !== undefined) updateData.brand_name = data.brandName;
  if (data.logoUrl !== undefined) updateData.logo_url = data.logoUrl;
  if (data.primaryColor !== undefined)
    updateData.primary_color = data.primaryColor;
  if (data.secondaryColor !== undefined)
    updateData.secondary_color = data.secondaryColor;
  if (data.customDomain !== undefined)
    updateData.custom_domain = data.customDomain;
  if (data.isActive !== undefined) updateData.is_active = data.isActive;

  try {
    const { error } = await supabase
      .from("white_label_configs")
      .update(updateData)
      .eq("entrepreneur_id", user.id);

    if (error) return { error: error.message };
  } catch {
    return {
      error: "La table white_label_configs n'est pas encore configurée",
    };
  }

  revalidatePath("/settings/white-label");
  return { success: true };
}

/** Returns which features are enabled for this workspace */
export async function getFeatureToggles(): Promise<string[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return ALL_MODULES;

  try {
    const { data: config, error } = await supabase
      .from("white_label_configs")
      .select("enabled_modules")
      .eq("entrepreneur_id", user.id)
      .single();

    if (error || !config) return ALL_MODULES;
    return (config.enabled_modules as string[]) || ALL_MODULES;
  } catch {
    return ALL_MODULES;
  }
}

/** Saves feature toggle config */
export async function updateFeatureToggles(toggles: string[]) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  try {
    const { error } = await supabase
      .from("white_label_configs")
      .update({ enabled_modules: toggles })
      .eq("entrepreneur_id", user.id);

    if (error) return { error: error.message };
  } catch {
    return {
      error: "La table white_label_configs n'est pas encore configurée",
    };
  }

  revalidatePath("/settings/white-label");
  revalidatePath("/settings/white-label/permissions");
  return { success: true };
}

export async function getPermissions() {
  return getFeatureToggles();
}

export async function updatePermissions(modules: string[]) {
  return updateFeatureToggles(modules);
}

export async function getPortalData() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Get matched setters for this entrepreneur
  const { data: setters } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, health_score, avatar_url")
    .eq("matched_entrepreneur_id", user.id)
    .in("role", ["setter", "closer"]);

  const setterIds = (setters || []).map((s: Record<string, unknown>) => s.id);

  // Get deals assigned to these setters
  const { data: deals } = setterIds.length
    ? await supabase
        .from("deals")
        .select("*, assigned_user:profiles!assigned_to(full_name)")
        .in("assigned_to", setterIds)
        .order("created_at", { ascending: false })
    : { data: [] };

  // Compute setter stats
  const setterStats = (setters || []).map((setter: Record<string, unknown>) => {
    const setterDeals = (deals || []).filter(
      (d: Record<string, unknown>) => d.assigned_to === setter.id,
    );
    const revenue = setterDeals.reduce(
      (sum: number, d: Record<string, unknown>) => sum + Number(d.value || 0),
      0,
    );
    return {
      ...setter,
      deals_count: setterDeals.length,
      revenue,
    };
  });

  // Client metrics
  const totalRevenue = (deals || []).reduce(
    (sum: number, d: Record<string, unknown>) => sum + Number(d.value || 0),
    0,
  );
  const avgHealthScore =
    (setters || []).length > 0
      ? (setters || []).reduce(
          (sum: number, s: Record<string, unknown>) =>
            sum + Number(s.health_score || 0),
          0,
        ) / (setters || []).length
      : 0;

  return {
    setters: setterStats,
    recentDeals: (deals || []).slice(0, 10),
    metrics: {
      activeSetters: (setters || []).length,
      totalRevenue,
      activeDeals: (deals || []).length,
      avgHealthScore: Math.round(avgHealthScore),
    },
  };
}

export async function generateMonthlyReport() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const now = new Date();
  const reportMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  // Check if report already exists for this month
  const { data: existing } = await supabase
    .from("entrepreneur_reports")
    .select("id")
    .eq("entrepreneur_id", user.id)
    .eq("report_month", reportMonth)
    .single();

  if (existing) return { error: "Le rapport de ce mois existe déjà" };

  // Get date range for this month
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59,
  );

  // Get setters matched to this entrepreneur
  const { data: setters } = await supabase
    .from("profiles")
    .select("id, health_score")
    .eq("matched_entrepreneur_id", user.id)
    .in("role", ["setter", "closer"]);

  const setterIds = (setters || []).map((s) => s.id);

  // Calculate real metrics from deals
  let revenue = 0;
  let dealsClosed = 0;
  let newProspects = 0;
  let totalDeals = 0;

  if (setterIds.length > 0) {
    // Get closed deals this month
    const { data: closedDeals } = await supabase
      .from("deals")
      .select("value")
      .in("assigned_to", setterIds)
      .eq("stage", "Fermé (gagné)")
      .gte("updated_at", startOfMonth.toISOString())
      .lte("updated_at", endOfMonth.toISOString());

    dealsClosed = closedDeals?.length || 0;
    revenue = (closedDeals || []).reduce((sum, d) => sum + (d.value || 0), 0);

    // Get new prospects this month
    const { count: prospectsCount } = await supabase
      .from("deals")
      .select("id", { count: "exact", head: true })
      .in("assigned_to", setterIds)
      .gte("created_at", startOfMonth.toISOString())
      .lte("created_at", endOfMonth.toISOString());

    newProspects = prospectsCount || 0;

    // Get total deals for conversion rate
    const { count: totalCount } = await supabase
      .from("deals")
      .select("id", { count: "exact", head: true })
      .in("assigned_to", setterIds)
      .gte("created_at", startOfMonth.toISOString())
      .lte("created_at", endOfMonth.toISOString());

    totalDeals = totalCount || 0;
  }

  // Calculate conversion rate
  const conversionRate =
    totalDeals > 0 ? Math.round((dealsClosed / totalDeals) * 100) : 0;

  // Calculate average setter performance (health score)
  const avgSetterPerformance =
    setters && setters.length > 0
      ? Math.round(
          setters.reduce((sum, s) => sum + (s.health_score || 0), 0) /
            setters.length,
        )
      : 0;

  // Calculate average deal value
  const avgDealValue = dealsClosed > 0 ? Math.round(revenue / dealsClosed) : 0;

  const metrics = {
    revenue,
    deals_closed: dealsClosed,
    new_prospects: newProspects,
    conversion_rate: conversionRate,
    setter_performance: avgSetterPerformance,
    avg_deal_value: avgDealValue,
    active_setters: setterIds.length,
  };

  const { data: report, error } = await supabase
    .from("entrepreneur_reports")
    .insert({
      entrepreneur_id: user.id,
      report_month: reportMonth,
      metrics,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  revalidatePath("/portal/reports");
  return { success: true, report };
}

export async function getReports() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("entrepreneur_reports")
    .select("*")
    .eq("entrepreneur_id", user.id)
    .order("report_month", { ascending: false });

  return data || [];
}
