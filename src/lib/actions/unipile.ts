"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getUnipileClient, UNIPILE_PROVIDER_MAP } from "@/lib/unipile";
import { getApiKey } from "@/lib/api-keys";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function requireAuth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");
  return { supabase, user };
}

async function requireAdmin() {
  const { supabase, user } = await requireAuth();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile || !["admin", "manager"].includes(profile.role)) {
    throw new Error("Accès refusé");
  }
  return { supabase, user };
}

// ---------------------------------------------------------------------------
// Connection status
// ---------------------------------------------------------------------------

export async function getUnipileStatus(): Promise<{
  configured: boolean;
  accounts: Array<{
    id: string;
    provider: string;
    channel: string;
    name: string;
    status: string;
  }>;
}> {
  const dsn = process.env.UNIPILE_DSN || (await getApiKey("UNIPILE_DSN"));
  const apiKey = process.env.UNIPILE_API_KEY || (await getApiKey("UNIPILE_API_KEY"));

  if (!dsn || !apiKey) {
    return { configured: false, accounts: [] };
  }

  try {
    const client = getUnipileClient();
    if (!client) return { configured: false, accounts: [] };

    const response = await client.account.getAll();
    const items = Array.isArray(response) ? response : (response as { items?: unknown[] }).items || [];

    const accounts = (items as Array<{
      id: string;
      type?: string;
      provider?: string;
      name?: string;
      connection_params?: { name?: string };
      status?: string;
    }>).map((acc) => ({
      id: acc.id,
      provider: acc.type || acc.provider || "unknown",
      channel: UNIPILE_PROVIDER_MAP[acc.type || acc.provider || ""] || "unknown",
      name: acc.name || acc.connection_params?.name || acc.id,
      status: acc.status || "connected",
    }));

    return { configured: true, accounts };
  } catch (err) {
    console.error("Unipile status error:", err);
    return { configured: true, accounts: [] };
  }
}

// ---------------------------------------------------------------------------
// Generate hosted auth link
// ---------------------------------------------------------------------------

export async function generateUnipileAuthLink(provider?: string): Promise<{
  url?: string;
  error?: string;
}> {
  try {
    await requireAdmin();

    const dsn = process.env.UNIPILE_DSN || (await getApiKey("UNIPILE_DSN"));
    const apiKey = process.env.UNIPILE_API_KEY || (await getApiKey("UNIPILE_API_KEY"));
    if (!dsn || !apiKey) return { error: "Unipile non configuré. Ajoutez UNIPILE_DSN et UNIPILE_API_KEY." };

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";

    // Use REST API directly for connect link (more control over parameters)
    const body: Record<string, unknown> = {
      type: "create",
      api_url: dsn,
      expiresOn: new Date(Date.now() + 30 * 60 * 1000).toISOString().replace(/\.\d{3}Z$/, ".000Z"),
      success_redirect_url: `${appUrl}/settings/integrations`,
      failure_redirect_url: `${appUrl}/settings/integrations`,
    };
    if (provider) {
      body.providers = [provider.toUpperCase()];
    } else {
      body.providers = "*";
    }

    const res = await fetch(`${dsn}/api/v1/hosted/accounts/link`, {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      return { error: `Erreur Unipile: ${err}` };
    }

    const data = await res.json();
    return { url: data.url };
  } catch (err) {
    console.error("Unipile auth link error:", err);
    return { error: err instanceof Error ? err.message : "Erreur de connexion Unipile" };
  }
}

// ---------------------------------------------------------------------------
// Disconnect account
// ---------------------------------------------------------------------------

export async function disconnectUnipileAccount(accountId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    await requireAdmin();
    const client = getUnipileClient();
    if (!client) return { success: false, error: "Unipile non configuré" };

    await client.account.delete(accountId);
    return { success: true };
  } catch (err) {
    console.error("Unipile disconnect error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erreur lors de la déconnexion",
    };
  }
}

// ---------------------------------------------------------------------------
// Send message (unified — uses startNewChat for new conversations)
// ---------------------------------------------------------------------------

export async function sendUnipileMessage(params: {
  accountId: string;
  recipientId: string;
  text: string;
  channel: string;
  chatId?: string;
  prospectId?: string;
}): Promise<{ messageId?: string; error?: string }> {
  try {
    const { supabase, user } = await requireAuth();
    const client = getUnipileClient();
    if (!client) return { error: "Unipile non configuré" };

    let messageId: string | null = null;

    if (params.chatId) {
      // Reply to existing chat
      const response = await client.messaging.sendMessage({
        chat_id: params.chatId,
        text: params.text,
      });
      const result = response as { message_id?: string };
      messageId = result.message_id || null;
    } else {
      // Start new conversation
      const response = await client.messaging.startNewChat({
        account_id: params.accountId,
        text: params.text,
        attendees_ids: [params.recipientId],
      });
      const result = response as { chat_id?: string };
      messageId = result.chat_id || null;
    }

    // Log to inbox_messages
    await supabase.from("inbox_messages").insert({
      user_id: user.id,
      prospect_id: params.prospectId || null,
      channel: params.channel,
      direction: "outbound",
      content: params.text,
      external_id: messageId,
      status: "sent",
      created_at: new Date().toISOString(),
    });

    revalidatePath("/inbox");
    revalidatePath(`/prospecting/${params.channel}`);

    return { messageId: messageId || undefined };
  } catch (err) {
    console.error("Unipile send message error:", err);
    return { error: err instanceof Error ? err.message : "Erreur d'envoi" };
  }
}

// ---------------------------------------------------------------------------
// Get conversations
// ---------------------------------------------------------------------------

export async function getUnipileConversations(accountId?: string): Promise<{
  conversations: Array<{
    id: string;
    provider: string;
    participants: string[];
    lastMessage?: string;
    lastMessageAt?: string;
    unreadCount: number;
  }>;
  error?: string;
}> {
  try {
    await requireAuth();
    const client = getUnipileClient();
    if (!client) return { conversations: [], error: "Unipile non configuré" };

    const params: { account_id?: string; limit?: number } = { limit: 50 };
    if (accountId) params.account_id = accountId;

    const response = await client.messaging.getAllChats(params);
    const items = Array.isArray(response) ? response : (response as { items?: unknown[] }).items || [];

    const conversations = (items as Array<{
      id: string;
      provider?: string;
      account_type?: string;
      attendees?: Array<{ display_name?: string; id?: string }>;
      last_message?: { text?: string; timestamp?: string };
      unread_count?: number;
    }>).map((chat) => ({
      id: chat.id,
      provider: UNIPILE_PROVIDER_MAP[chat.provider || chat.account_type || ""] || "unknown",
      participants: (chat.attendees || []).map((a) => a.display_name || a.id || ""),
      lastMessage: chat.last_message?.text,
      lastMessageAt: chat.last_message?.timestamp,
      unreadCount: chat.unread_count || 0,
    }));

    return { conversations };
  } catch (err) {
    console.error("Unipile conversations error:", err);
    return {
      conversations: [],
      error: err instanceof Error ? err.message : "Erreur de récupération",
    };
  }
}

// ---------------------------------------------------------------------------
// Get messages in a conversation
// ---------------------------------------------------------------------------

export async function getUnipileMessages(chatId: string): Promise<{
  messages: Array<{
    id: string;
    text: string;
    sender: string;
    senderId: string;
    timestamp: string;
    isFromMe: boolean;
  }>;
  error?: string;
}> {
  try {
    await requireAuth();
    const client = getUnipileClient();
    if (!client) return { messages: [], error: "Unipile non configuré" };

    const response = await client.messaging.getAllMessagesFromChat({
      chat_id: chatId,
      limit: 100,
    });

    const items = Array.isArray(response) ? response : (response as { items?: unknown[] }).items || [];

    const messages = (items as Array<{
      id: string;
      text?: string;
      body?: string;
      sender?: { display_name?: string; id?: string };
      timestamp?: string;
      is_sender?: boolean;
    }>).map((msg) => ({
      id: msg.id,
      text: msg.text || msg.body || "",
      sender: msg.sender?.display_name || "",
      senderId: msg.sender?.id || "",
      timestamp: msg.timestamp || "",
      isFromMe: msg.is_sender || false,
    }));

    return { messages };
  } catch (err) {
    console.error("Unipile messages error:", err);
    return {
      messages: [],
      error: err instanceof Error ? err.message : "Erreur de récupération",
    };
  }
}

// ---------------------------------------------------------------------------
// LinkedIn: get profile
// ---------------------------------------------------------------------------

export async function getLinkedInProfileViaUnipile(accountId: string, profileUrl: string): Promise<{
  data?: {
    id: string;
    name: string;
    headline: string | null;
    profile_url: string;
    company: string | null;
    location: string | null;
    source: "unipile";
  };
  error?: string;
}> {
  try {
    await requireAuth();
    const client = getUnipileClient();
    if (!client) return { error: "Unipile non configuré" };

    const vanityMatch = profileUrl.match(/linkedin\.com\/in\/([^/?#]+)/);
    const identifier = vanityMatch?.[1] || profileUrl;

    const response = await client.users.getProfile({
      account_id: accountId,
      identifier,
    });

    const profile = response as {
      id?: string;
      first_name?: string;
      last_name?: string;
      headline?: string;
      public_identifier?: string;
      company?: string;
      location?: string;
    };

    return {
      data: {
        id: profile.id || identifier,
        name: [profile.first_name, profile.last_name].filter(Boolean).join(" ") || identifier,
        headline: profile.headline || null,
        profile_url: profileUrl,
        company: profile.company || null,
        location: profile.location || null,
        source: "unipile",
      },
    };
  } catch (err) {
    console.error("Unipile LinkedIn profile error:", err);
    return { error: err instanceof Error ? err.message : "Erreur de récupération profil" };
  }
}

// ---------------------------------------------------------------------------
// Calendar: list events (via REST — not in SDK)
// ---------------------------------------------------------------------------

export async function getUnipileCalendarEvents(accountId: string, params?: {
  start?: string;
  end?: string;
}): Promise<{
  events: Array<{
    id: string;
    title: string;
    start: string;
    end: string;
    attendees: string[];
    location: string | null;
    description: string | null;
  }>;
  error?: string;
}> {
  try {
    await requireAuth();

    const dsn = process.env.UNIPILE_DSN || (await getApiKey("UNIPILE_DSN"));
    const apiKey = process.env.UNIPILE_API_KEY || (await getApiKey("UNIPILE_API_KEY"));
    if (!dsn || !apiKey) return { events: [], error: "Unipile non configuré" };

    const queryParams = new URLSearchParams({ account_id: accountId });
    if (params?.start) queryParams.set("start", params.start);
    if (params?.end) queryParams.set("end", params.end);

    const res = await fetch(`${dsn}/api/v1/calendar/events?${queryParams}`, {
      headers: { "X-API-KEY": apiKey },
    });

    if (!res.ok) {
      return { events: [], error: `Erreur calendrier: ${res.statusText}` };
    }

    const data = await res.json();
    const items = Array.isArray(data) ? data : data.items || [];

    const events = (items as Array<{
      id: string;
      title?: string;
      summary?: string;
      start?: { date_time?: string; date?: string };
      end?: { date_time?: string; date?: string };
      attendees?: Array<{ email?: string; display_name?: string }>;
      location?: string;
      description?: string;
    }>).map((evt) => ({
      id: evt.id,
      title: evt.title || evt.summary || "Sans titre",
      start: evt.start?.date_time || evt.start?.date || "",
      end: evt.end?.date_time || evt.end?.date || "",
      attendees: (evt.attendees || []).map((a) => a.display_name || a.email || ""),
      location: evt.location || null,
      description: evt.description || null,
    }));

    return { events };
  } catch (err) {
    console.error("Unipile calendar events error:", err);
    return {
      events: [],
      error: err instanceof Error ? err.message : "Erreur de récupération calendrier",
    };
  }
}

// ---------------------------------------------------------------------------
// Calendar: create event (via REST)
// ---------------------------------------------------------------------------

export async function createUnipileCalendarEvent(accountId: string, event: {
  title: string;
  start: string;
  end: string;
  description?: string;
  location?: string;
  attendees?: string[];
}): Promise<{ eventId?: string; error?: string }> {
  try {
    await requireAuth();

    const dsn = process.env.UNIPILE_DSN || (await getApiKey("UNIPILE_DSN"));
    const apiKey = process.env.UNIPILE_API_KEY || (await getApiKey("UNIPILE_API_KEY"));
    if (!dsn || !apiKey) return { error: "Unipile non configuré" };

    const res = await fetch(`${dsn}/api/v1/calendar/events`, {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        account_id: accountId,
        title: event.title,
        start: { date_time: event.start },
        end: { date_time: event.end },
        description: event.description,
        location: event.location,
        attendees: event.attendees?.map((email) => ({ email })),
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return { error: `Erreur création événement: ${err}` };
    }

    const data = await res.json();
    revalidatePath("/bookings");
    return { eventId: data.id || data.event_id };
  } catch (err) {
    console.error("Unipile create event error:", err);
    return { error: err instanceof Error ? err.message : "Erreur de création événement" };
  }
}

// ---------------------------------------------------------------------------
// Webhook handler
// ---------------------------------------------------------------------------

export async function handleUnipileWebhook(body: Record<string, unknown>): Promise<void> {
  const supabase = await createClient();

  const eventType = body.event as string;
  const data = body.data as Record<string, unknown> | undefined;

  if (!data) return;

  switch (eventType) {
    case "message_received": {
      const accountType = (data.account_type as string) || "";
      const channel = UNIPILE_PROVIDER_MAP[accountType] || "unknown";
      const senderId = (data.sender as { id?: string })?.id || null;
      const text = (data.text as string) || (data.body as string) || "";
      const externalId = data.id as string;

      // Find the prospect
      let prospectId: string | null = null;
      if (senderId) {
        const { data: prospect } = await supabase
          .from("prospects")
          .select("id")
          .or(`instagram_id.eq.${senderId},profile_url.ilike.%${senderId}%,phone.eq.${senderId}`)
          .limit(1)
          .single();
        prospectId = prospect?.id || null;
      }

      // Find admin user
      const { data: adminProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("role", "admin")
        .limit(1)
        .single();

      if (adminProfile) {
        await supabase.from("inbox_messages").insert({
          user_id: adminProfile.id,
          prospect_id: prospectId,
          channel,
          direction: "inbound",
          content: text,
          external_id: externalId,
          status: "received",
          created_at: new Date().toISOString(),
        });

        await supabase.from("notifications").insert({
          user_id: adminProfile.id,
          type: "message",
          title: `Nouveau message ${channel}`,
          body: text.slice(0, 100),
          data: { channel, sender_id: senderId, message_id: externalId },
          created_at: new Date().toISOString(),
        });
      }

      // Auto-create prospect
      if (!prospectId && senderId && adminProfile) {
        const senderName =
          (data.sender as { display_name?: string })?.display_name || senderId;

        await supabase.from("prospects").insert({
          name: senderName,
          platform: channel,
          status: "new",
          ...(channel === "instagram" ? { instagram_id: senderId } : {}),
          ...(channel === "whatsapp" ? { phone: senderId } : {}),
          ...(channel === "linkedin"
            ? { profile_url: `https://linkedin.com/in/${senderId}` }
            : {}),
          created_by: adminProfile.id,
          created_at: new Date().toISOString(),
        });
      }
      break;
    }

    case "account_connected":
    case "account_disconnected":
      console.log(`Unipile account event: ${eventType}`, data);
      break;

    default:
      console.log(`Unipile webhook event: ${eventType}`);
  }
}
