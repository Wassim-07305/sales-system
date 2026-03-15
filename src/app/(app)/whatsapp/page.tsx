import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  getWhatsAppConnection,
  getConversations,
} from "@/lib/actions/whatsapp";
import { getUnipileStatus } from "@/lib/actions/unipile";
import { WhatsAppView } from "./whatsapp-view";

export default async function WhatsAppPage() {
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

  if (!profile || !["admin", "manager", "setter"].includes(profile.role)) {
    redirect("/dashboard");
  }

  const [dbConnection, conversations, unipileStatus] = await Promise.all([
    getWhatsAppConnection(),
    getConversations(),
    getUnipileStatus(),
  ]);

  // If no Meta connection but Unipile WhatsApp is connected, provide a virtual connection
  let connection = dbConnection;
  if (!connection) {
    const waAccount = unipileStatus.accounts.find(
      (a) => a.provider.toUpperCase() === "WHATSAPP"
    );
    if (waAccount) {
      connection = {
        id: `unipile-${waAccount.id}`,
        phone_number: waAccount.name || null,
        status: "connected",
        connected_at: new Date().toISOString(),
      };
    }
  }

  return (
    <WhatsAppView
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      connection={connection as any}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      conversations={conversations as any}
    />
  );
}
