import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getWhatsAppConnection } from "@/lib/actions/whatsapp";
import { getApiKey } from "@/lib/api-keys";
import { WaSettingsView } from "./wa-settings-view";

export default async function WhatsAppSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [connection, ghlKey, iClosedKey] = await Promise.all([
    getWhatsAppConnection(),
    getApiKey("GHL_API_KEY"),
    getApiKey("ICLOSED_API_KEY"),
  ]);

  const integrationKeys = {
    ghl_api_key: ghlKey ? "********" : null,
    iclosed_api_key: iClosedKey ? "********" : null,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <WaSettingsView connection={connection as any} integrationKeys={integrationKeys} />;
}
