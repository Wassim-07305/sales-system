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

  const connection = await getWhatsAppConnection();
  const conversations = await getConversations();

   
  return (
    <WhatsAppView
      connection={connection as any}
      conversations={conversations as any}
    />
  );
}
