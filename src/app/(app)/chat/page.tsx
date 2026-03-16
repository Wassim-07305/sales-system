import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ChatLayout } from "./chat-layout";
import type { UserRole } from "@/lib/types/database";
import { getConversations as getWAConversations } from "@/lib/actions/whatsapp";
import {
  getUnipileStatus,
  getUnipileSocialConversations,
} from "@/lib/actions/unipile";

export default async function ChatPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch all data in parallel
  const [
    channelsRes,
    profileRes,
    teamRes,
    waConversations,
    linkedinConversations,
    instagramConversations,
    unipileStatus,
  ] = await Promise.all([
    supabase
      .from("channels")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("role").eq("id", user.id).single(),
    supabase
      .from("profiles")
      .select("id, full_name, role, avatar_url")
      .neq("id", user.id),
    getWAConversations().catch(() => []),
    getUnipileSocialConversations("linkedin").catch(() => []),
    getUnipileSocialConversations("instagram").catch(() => []),
    getUnipileStatus().catch(() => ({ configured: false, accounts: [] })),
  ]);

  // Compute unread counts inline
  const unreadCounts: Record<string, number> = {};
  try {
    const { data: reads } = await supabase
      .from("channel_reads")
      .select("channel_id, last_read_at")
      .eq("user_id", user.id);

    const readMap: Record<string, string> = {};
    for (const r of reads || []) {
      readMap[r.channel_id] = r.last_read_at;
    }

    const channels = channelsRes.data || [];
    for (const channel of channels) {
      let query = supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("channel_id", channel.id)
        .neq("sender_id", user.id);

      const lastRead = readMap[channel.id];
      if (lastRead) {
        query = query.gt("created_at", lastRead);
      }

      const { count } = await query;
      if (count && count > 0) {
        unreadCounts[channel.id] = count;
      }
    }
  } catch {
    // Non-blocking
  }

  const userRole = (profileRes.data?.role as UserRole) || "client_b2c";

  return (
    <ChatLayout
      initialChannels={
        (channelsRes.data || []) as Parameters<
          typeof ChatLayout
        >[0]["initialChannels"]
      }
      currentUserId={user.id}
      initialUnreadCounts={unreadCounts}
      userRole={userRole}
      teamMembers={
        (teamRes.data || []) as Parameters<typeof ChatLayout>[0]["teamMembers"]
      }
      initialWAConversations={
        waConversations as Parameters<
          typeof ChatLayout
        >[0]["initialWAConversations"]
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      initialLinkedinConversations={linkedinConversations as any}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      initialInstagramConversations={instagramConversations as any}
      unipileWhatsApp={
        unipileStatus.configured
          ? {
              connected: !!unipileStatus.accounts.find(
                (a: { provider: string }) =>
                  a.provider.toUpperCase() === "WHATSAPP",
              ),
              accountName: unipileStatus.accounts.find(
                (a: { provider: string }) =>
                  a.provider.toUpperCase() === "WHATSAPP",
              )?.name,
            }
          : null
      }
      unipileLinkedin={
        unipileStatus.configured
          ? {
              connected: !!unipileStatus.accounts.find(
                (a: { provider: string }) =>
                  a.provider.toUpperCase() === "LINKEDIN",
              ),
              accountName: unipileStatus.accounts.find(
                (a: { provider: string }) =>
                  a.provider.toUpperCase() === "LINKEDIN",
              )?.name,
            }
          : null
      }
      unipileInstagram={
        unipileStatus.configured
          ? {
              connected: !!unipileStatus.accounts.find(
                (a: { provider: string }) =>
                  a.provider.toUpperCase() === "INSTAGRAM",
              ),
              accountName: unipileStatus.accounts.find(
                (a: { provider: string }) =>
                  a.provider.toUpperCase() === "INSTAGRAM",
              )?.name,
            }
          : null
      }
    />
  );
}
