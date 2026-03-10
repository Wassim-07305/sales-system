import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AdminDashboard } from "./admin-dashboard";
import { SetterDashboard } from "./setter-dashboard";
import { ClientDashboard } from "./client-dashboard";
import {
  getAdminDashboardData,
  getClientDashboardData,
  getSetterDashboardData,
} from "@/lib/actions/dashboard";
import { calculateReadinessScore } from "@/lib/actions/readiness";
import { getDashboardWidgets, getWidgetData } from "@/lib/actions/dashboard-builder";
import type { UserRole } from "@/lib/types/database";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const role = (profile?.role || "client_b2c") as UserRole;

  switch (role) {
    case "admin":
    case "manager": {
      const [data, customWidgets] = await Promise.all([
        getAdminDashboardData(),
        getDashboardWidgets(),
      ]);

      // Récupérer les données de chaque widget personnalisé
      const widgetDataMap: Record<string, unknown> = {};
      for (const widget of customWidgets) {
        try {
          widgetDataMap[widget.type] = await getWidgetData(widget.type);
        } catch {
          widgetDataMap[widget.type] = { value: null, label: widget.type };
        }
      }

      return (
        <AdminDashboard
          data={data}
          customWidgets={customWidgets as any}
          widgetData={widgetDataMap}
        />
      );
    }
    case "setter":
    case "closer": {
      const data = await getSetterDashboardData(user.id);
      return <SetterDashboard data={data} />;
    }
    case "client_b2b":
    case "client_b2c": {
      const [data, readiness] = await Promise.all([
        getClientDashboardData(user.id),
        calculateReadinessScore(user.id),
      ]);
      return (
        <ClientDashboard
          data={data}
          userName={profile?.full_name || "Utilisateur"}
          readiness={readiness}
        />
      );
    }
    default: {
      const [data, readiness] = await Promise.all([
        getClientDashboardData(user.id),
        calculateReadinessScore(user.id),
      ]);
      return (
        <ClientDashboard
          data={data}
          userName={profile?.full_name || "Utilisateur"}
          readiness={readiness}
        />
      );
    }
  }
}
