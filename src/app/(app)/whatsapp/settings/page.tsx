import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getWhatsAppConnection } from "@/lib/actions/whatsapp";
import { WaSettingsView } from "./wa-settings-view";

export default async function WhatsAppSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const connection = await getWhatsAppConnection();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <WaSettingsView connection={connection as any} />;
}
