import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AdminDashboard } from "./admin-dashboard";
import { SetterDashboard } from "./setter-dashboard";
import { ClientDashboard } from "./client-dashboard";
import {
  getAdminDashboardData,
  getClientDashboardData,
  getSetterDashboardData,
  getB2BDashboardData,
  getMobileDashboardWidgetData,
} from "@/lib/actions/dashboard";
import { MobileDashboardWidget } from "@/components/mobile-dashboard-widget";
import { calculateReadinessScore } from "@/lib/actions/readiness";
import {
  getDashboardWidgets,
  getWidgetData,
} from "@/lib/actions/dashboard-builder";
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

  // F85: Fetch mobile widget data for admin/manager/setter/closer roles
  const mobileWidgetData =
    role === "admin" || role === "manager" || role === "setter" || role === "closer"
      ? await getMobileDashboardWidgetData()
      : null;

  const mobileWidget = mobileWidgetData ? (
    <MobileDashboardWidget
      dealsEnCours={mobileWidgetData.dealsEnCours}
      caDuMois={mobileWidgetData.caDuMois}
      tachesDuJour={mobileWidgetData.tachesDuJour}
      prochainsRdv={mobileWidgetData.prochainsRdv}
    />
  ) : null;

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
        <>
          {mobileWidget}
          <AdminDashboard
            data={data}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            customWidgets={customWidgets as any}
            widgetData={widgetDataMap}
          />
        </>
      );
    }
    case "setter":
    case "closer": {
      const data = await getSetterDashboardData(user.id);
      return (
        <>
          {mobileWidget}
          <SetterDashboard data={data} />
        </>
      );
    }
    case "client_b2b": {
      const b2bData = await getB2BDashboardData(user.id);
      return (
        <ClientDashboard
          role="client_b2b"
          b2bData={b2bData}
          userName={profile?.full_name || "Utilisateur"}
        />
      );
    }
    case "client_b2c": {
      const [data, readiness] = await Promise.all([
        getClientDashboardData(user.id),
        calculateReadinessScore(user.id),
      ]);
      return (
        <ClientDashboard
          role="client_b2c"
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
          role="client_b2c"
          data={data}
          userName={profile?.full_name || "Utilisateur"}
          readiness={readiness}
        />
      );
    }
  }
}
