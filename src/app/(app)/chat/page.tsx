import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ensureDefaultChannels } from "@/lib/actions/communication";
import { ChatPageClient } from "./chat-page-client";

export default async function ChatPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Ensure Canal Général exists server-side (doesn't depend on browser auth)
  ensureDefaultChannels().catch(() => {});

  return <ChatPageClient />;
}
