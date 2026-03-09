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
      const data = await getAdminDashboardData();
      return <AdminDashboard data={data} />;
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
