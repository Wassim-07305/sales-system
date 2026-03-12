import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  getWhatsAppConnection,
  getConversations,
} from "@/lib/actions/whatsapp";
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

  const connection = await getWhatsAppConnection();
  const conversations = await getConversations();

  return (
    <WhatsAppView
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      connection={connection as any}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      conversations={conversations as any}
    />
  );
}
