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

export async function getWhiteLabelConfig() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: existing } = await supabase
    .from("white_label_configs")
    .select("*")
    .eq("entrepreneur_id", user.id)
    .single();

  if (existing) return existing;

  // Create default config
  const { data: newConfig } = await supabase
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

  return newConfig;
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

  const { error } = await supabase
    .from("white_label_configs")
    .update(updateData)
    .eq("entrepreneur_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/settings/white-label");
  return { success: true };
}

export async function getPermissions() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: config } = await supabase
    .from("white_label_configs")
    .select("enabled_modules")
    .eq("entrepreneur_id", user.id)
    .single();

  return config?.enabled_modules || ALL_MODULES;
}

export async function updatePermissions(modules: string[]) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const { error } = await supabase
    .from("white_label_configs")
    .update({ enabled_modules: modules })
    .eq("entrepreneur_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/settings/white-label/permissions");
  return { success: true };
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
      (d: Record<string, unknown>) => d.assigned_to === setter.id
    );
    const revenue = setterDeals.reduce(
      (sum: number, d: Record<string, unknown>) => sum + Number(d.value || 0),
      0
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
    0
  );
  const avgHealthScore =
    (setters || []).length > 0
      ? (setters || []).reduce(
          (sum: number, s: Record<string, unknown>) =>
            sum + Number(s.health_score || 0),
          0
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

  // Generate mock metrics
  const mockMetrics = {
    revenue: Math.round(Math.random() * 50000 + 10000),
    deals_closed: Math.floor(Math.random() * 20 + 5),
    new_prospects: Math.floor(Math.random() * 50 + 10),
    conversion_rate: Math.round(Math.random() * 30 + 10),
    setter_performance: Math.round(Math.random() * 40 + 60),
    avg_deal_value: Math.round(Math.random() * 3000 + 1000),
  };

  const { data: report, error } = await supabase
    .from("entrepreneur_reports")
    .insert({
      entrepreneur_id: user.id,
      report_month: reportMonth,
      metrics: mockMetrics,
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
