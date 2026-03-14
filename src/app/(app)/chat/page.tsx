import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ChatLayout } from "./chat-layout";
import { getUnreadCounts } from "@/lib/actions/communication";
import type { UserRole } from "@/lib/types/database";

export default async function ChatPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: channels }, unreadCounts, { data: profile }, { data: teamMembers }] =
    await Promise.all([
      supabase
        .from("channels")
        .select("*")
        .order("created_at", { ascending: false }),
      getUnreadCounts(),
      supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single(),
      supabase
        .from("profiles")
        .select("id, full_name, role, avatar_url")
        .neq("id", user.id)
        .order("full_name"),
    ]);

  const userRole = (profile?.role as UserRole) || "client_b2c";

  return (
    <ChatLayout
      initialChannels={channels || []}
      currentUserId={user.id}
      initialUnreadCounts={unreadCounts}
      userRole={userRole}
      teamMembers={teamMembers || []}
    />
  );
}
