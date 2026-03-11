import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSettingsIA, getLastSyncTime } from "@/lib/actions/settings-ia";
import { SettingsIAView } from "./settings-ia-view";

export default async function SettingsIAPage() {
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

  if (
    profile?.role !== "client_b2b" &&
    profile?.role !== "admin" &&
    profile?.role !== "manager"
  ) {
    redirect("/dashboard");
  }

  const settings = await getSettingsIA();
  const lastSync = await getLastSyncTime();

  return <SettingsIAView initialSettings={settings} lastSync={lastSync} />;
}
