import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ChatLayout } from "./chat-layout";
import { getUnreadCounts } from "@/lib/actions/communication";

export default async function ChatPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: channels }, unreadCounts] = await Promise.all([
    supabase
      .from("channels")
      .select("*")
      .order("created_at", { ascending: false }),
    getUnreadCounts(),
  ]);

  return (
    <ChatLayout
      initialChannels={channels || []}
      currentUserId={user.id}
      initialUnreadCounts={unreadCounts}
    />
  );
}
