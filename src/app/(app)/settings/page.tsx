import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrgSettings } from "@/lib/actions/settings";
import { SettingsView } from "./settings-view";
import { ClientSettingsView } from "./client-settings-view";
import { B2BSettingsView } from "./b2b-settings-view";

export default async function SettingsPage() {
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

  const role = profile?.role || "client_b2c";

  if (role === "client_b2b") {
    return <B2BSettingsView userEmail={user.email || ""} />;
  }

  if (role === "client_b2c") {
    return <ClientSettingsView userEmail={user.email || ""} />;
  }

  const settings = await getOrgSettings();
  return <SettingsView initialSettings={settings} />;
}
