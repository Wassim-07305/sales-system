import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AdminDashboard } from "./admin-dashboard";
import { SetterDashboard } from "./setter-dashboard";
import { ClientDashboard } from "./client-dashboard";
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
    case "manager":
      return <AdminDashboard />;
    case "setter":
    case "closer":
      return <SetterDashboard />;
    case "client_b2b":
    case "client_b2c":
      return <ClientDashboard />;
    default:
      return <ClientDashboard />;
  }
}
