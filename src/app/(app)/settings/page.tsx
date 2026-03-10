import { getOrgSettings } from "@/lib/actions/settings";
import { SettingsView } from "./settings-view";

export default async function SettingsPage() {
  const settings = await getOrgSettings();

  return <SettingsView initialSettings={settings} />;
}
