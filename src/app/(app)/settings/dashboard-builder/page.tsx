import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getDashboardWidgets } from "@/lib/actions/dashboard-builder";
import { BuilderView } from "./builder-view";

export default async function DashboardBuilderPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "manager"].includes(profile.role)) {
    redirect("/dashboard");
  }

  const widgets = await getDashboardWidgets();
  return <BuilderView initialWidgets={widgets} />;
}
