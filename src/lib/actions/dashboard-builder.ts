"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getDashboardWidgets() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("dashboard_widgets")
    .select("*")
    .eq("user_id", user.id)
    .order("position", { ascending: true });

  return data || [];
}

export async function saveDashboardWidgets(
  widgets: Array<{
    type: string;
    position: number;
    config: Record<string, unknown>;
  }>
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifie");

  // Delete existing widgets for user
  await supabase.from("dashboard_widgets").delete().eq("user_id", user.id);

  // Insert new widgets
  if (widgets.length > 0) {
    const rows = widgets.map((w) => ({
      user_id: user.id,
      type: w.type,
      position: w.position,
      config: w.config,
    }));

    const { error } = await supabase.from("dashboard_widgets").insert(rows);
    if (error) throw new Error(error.message);
  }

  revalidatePath("/dashboard");
  revalidatePath("/settings/dashboard-builder");
}

export async function getWidgetData(widgetType: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifie");

  const now = new Date();
  const startOfMonth = new Date(
    now.getFullYear(),
    now.getMonth(),
    1
  ).toISOString();

  switch (widgetType) {
    case "revenue_month": {
      const { data: signedStage } = await supabase
        .from("pipeline_stages")
        .select("id")
        .eq("name", "Client Signé")
        .single();

      const { data: deals } = await supabase
        .from("deals")
        .select("value, stage_id")
        .gte("created_at", startOfMonth);

      const revenue = (deals || [])
        .filter((d) => d.stage_id === signedStage?.id)
        .reduce((sum, d) => sum + (d.value || 0), 0);

      return { value: revenue, label: "CA du Mois" };
    }

    case "deals_count": {
      const { count } = await supabase
        .from("deals")
        .select("id", { count: "exact", head: true })
        .gte("created_at", startOfMonth);

      return { value: count || 0, label: "Nombre de Deals" };
    }

    case "conversion_rate": {
      const { data: signedStage } = await supabase
        .from("pipeline_stages")
        .select("id")
        .eq("name", "Client Signé")
        .single();

      const { data: deals } = await supabase
        .from("deals")
        .select("stage_id")
        .gte("created_at", startOfMonth);

      const total = (deals || []).length;
      const signed = (deals || []).filter(
        (d) => d.stage_id === signedStage?.id
      ).length;
      const rate = total > 0 ? Math.round((signed / total) * 100) : 0;

      return { value: rate, label: "Taux de Conversion", suffix: "%" };
    }

    case "pipeline_value": {
      const { data: signedStage } = await supabase
        .from("pipeline_stages")
        .select("id")
        .eq("name", "Client Signé")
        .single();

      const { data: deals } = await supabase
        .from("deals")
        .select("value, stage_id");

      const pipelineValue = (deals || [])
        .filter((d) => d.stage_id !== signedStage?.id)
        .reduce((sum, d) => sum + (d.value || 0), 0);

      return { value: pipelineValue, label: "Valeur Pipeline" };
    }

    case "top_sources": {
      const { data: deals } = await supabase
        .from("deals")
        .select("source")
        .gte("created_at", startOfMonth);

      const sourceMap = new Map<string, number>();
      (deals || []).forEach((d) => {
        const source = (d.source as string) || "Inconnu";
        sourceMap.set(source, (sourceMap.get(source) || 0) + 1);
      });

      const sources = Array.from(sourceMap.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      return { value: sources, label: "Top Sources" };
    }

    case "recent_deals": {
      const { data: deals } = await supabase
        .from("deals")
        .select("id, title, value, created_at, pipeline_stages(name)")
        .order("created_at", { ascending: false })
        .limit(5);

      const recentDeals = (deals || []).map((d) => {
        const stage = Array.isArray(d.pipeline_stages)
          ? d.pipeline_stages[0]
          : d.pipeline_stages;
        return {
          id: d.id,
          title: d.title,
          value: d.value,
          stage: (stage as { name: string } | null)?.name || "-",
        };
      });

      return { value: recentDeals, label: "Deals Recents" };
    }

    default:
      return { value: null, label: "Inconnu" };
  }
}
