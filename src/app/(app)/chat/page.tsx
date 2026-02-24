import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ChatLayout } from "./chat-layout";

export default async function ChatPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: channels } = await supabase
    .from("channels")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <ChatLayout
      initialChannels={channels || []}
      currentUserId={user.id}
    />
  );
}
