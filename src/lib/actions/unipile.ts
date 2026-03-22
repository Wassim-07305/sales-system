"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getUnipileClient, UNIPILE_PROVIDER_MAP } from "@/lib/unipile";

// Extended provider map for chat contexts: GOOGLE/MICROSOFT/OAuth variants are email
const CHAT_PROVIDER_MAP: Record<string, string> = {
  ...UNIPILE_PROVIDER_MAP,
  GOOGLE: "email",
  GOOGLE_OAUTH: "email",
  MICROSOFT: "email",
  MICROSOFT_OAUTH: "email",
};
import { getApiKey } from "@/lib/api-keys";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format a raw phone number like "33624895494" → "+33 6 24 89 54 94" */
function formatPhone(raw: string): string {
  // Remove any non-digit prefix
  const digits = raw.replace(/\D/g, "");
  // French numbers: 33XXXXXXXXX (11 digits)
  if (digits.startsWith("33") && digits.length >= 11) {
    const national = digits.slice(2); // e.g. "624895494"
    const padded = national.length === 9 ? "0" + national : national;
    // Format as +33 X XX XX XX XX
    return `+33 ${padded[1]} ${padded.slice(2, 4)} ${padded.slice(4, 6)} ${padded.slice(6, 8)} ${padded.slice(8, 10)}`;
  }
  // Other international: just add + prefix
  return `+${digits}`;
}

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
  const apiKey =
    process.env.UNIPILE_API_KEY || (await getApiKey("UNIPILE_API_KEY"));

  if (!dsn || !apiKey) {
    return { configured: false, accounts: [] };
  }

  try {
    const client = getUnipileClient();
    if (!client) return { configured: false, accounts: [] };

    const response = await client.account.getAll();
    const items = Array.isArray(response)
      ? response
      : (response as { items?: unknown[] }).items || [];

    const accounts = (
      items as Array<{
        id: string;
        type?: string;
        provider?: string;
        name?: string;
        connection_params?: { name?: string };
        status?: string;
      }>
    ).map((acc) => ({
      id: acc.id,
      provider: acc.type || acc.provider || "unknown",
      channel:
        CHAT_PROVIDER_MAP[acc.type || acc.provider || ""] || "unknown",
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
    const apiKey =
      process.env.UNIPILE_API_KEY || (await getApiKey("UNIPILE_API_KEY"));
    if (!dsn || !apiKey)
      return {
        error: "Unipile non configuré. Ajoutez UNIPILE_DSN et UNIPILE_API_KEY.",
      };

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : null) ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
      "http://localhost:3001";

    // Use REST API directly for connect link (more control over parameters)
    const body: Record<string, unknown> = {
      type: "create",
      api_url: dsn,
      expiresOn: new Date(Date.now() + 30 * 60 * 1000)
        .toISOString()
        .replace(/\.\d{3}Z$/, ".000Z"),
      success_redirect_url: `${appUrl}/chat/connected`,
      failure_redirect_url: `${appUrl}/chat`,
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
    return {
      error: err instanceof Error ? err.message : "Erreur de connexion Unipile",
    };
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
      error:
        err instanceof Error ? err.message : "Erreur lors de la déconnexion",
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
    accountId?: string;
    provider: string;
    participants: string[];
    pictureUrl?: string;
    lastMessage?: string;
    lastMessageAt?: string;
    unreadCount: number;
  }>;
  error?: string;
}> {
  try {
    await requireAuth();
    const dsn = process.env.UNIPILE_DSN;
    const apiKey = process.env.UNIPILE_API_KEY;
    if (!dsn || !apiKey) return { conversations: [], error: "Unipile non configuré" };

    const url = new URL(`${dsn}/api/v1/chats`);
    url.searchParams.set("limit", "50");
    if (accountId) url.searchParams.set("account_id", accountId);

    const res = await fetch(url.toString(), {
      headers: { "X-API-KEY": apiKey },
    });
    if (!res.ok) {
      console.error("Unipile chats error:", res.status);
      return { conversations: [], error: "Erreur de récupération des conversations" };
    }

    const data = await res.json();
    const items = Array.isArray(data) ? data : (data as { items?: unknown[] }).items || [];

    const conversations = (
      items as Array<{
        id: string;
        account_id?: string;
        name?: string | null;
        provider?: string;
        account_type?: string;
        attendees?: Array<{
          display_name?: string;
          name?: string;
          id?: string;
          picture_url?: string;
          is_self?: number;
        }>;
        attendee_public_identifier?: string;
        last_message?: { text?: string; timestamp?: string };
        timestamp?: string;
        unread_count?: number;
      }>
    ).map((chat) => {
      // Build participant name: use chat.name, then attendees, then identifier
      const participantNames: string[] = [];
      let pictureUrl: string | undefined;

      // Filter out "self" attendees to get the other person
      const otherAttendees = (chat.attendees || []).filter((a) => a.is_self !== 1);

      if (chat.name) {
        participantNames.push(chat.name);
        // Get picture from first non-self attendee
        if (otherAttendees.length > 0) {
          pictureUrl = otherAttendees[0].picture_url;
        }
      } else if (otherAttendees.length > 0) {
        for (const a of otherAttendees) {
          const n = a.display_name || a.name || a.id || "";
          if (n) participantNames.push(n);
        }
        pictureUrl = otherAttendees[0].picture_url;
      } else if (chat.attendees && chat.attendees.length > 0) {
        // Fallback: use all attendees if no non-self found
        for (const a of chat.attendees) {
          const n = a.display_name || a.name || a.id || "";
          if (n) participantNames.push(n);
        }
        pictureUrl = chat.attendees[0].picture_url;
      } else if (chat.attendee_public_identifier) {
        const id = chat.attendee_public_identifier.replace(/@.*$/, "");
        participantNames.push(/^\d+$/.test(id) ? formatPhone(id) : id);
      }

      return {
        id: chat.id,
        accountId: chat.account_id,
        provider:
          CHAT_PROVIDER_MAP[chat.provider || chat.account_type || ""] ||
          "unknown",
        participants: participantNames,
        pictureUrl,
        lastMessage: chat.last_message?.text,
        lastMessageAt: chat.last_message?.timestamp || chat.timestamp,
        unreadCount: chat.unread_count || 0,
      };
    });

    // Enrich all conversations with attendee names & photos
    if (conversations.length > 0) {
      await Promise.allSettled(
        conversations.map(async (conv) => {
          try {
            const attRes = await fetch(
              `${dsn}/api/v1/chats/${conv.id}/attendees`,
              { headers: { "X-API-KEY": apiKey! } },
            );
            if (!attRes.ok) return;
            const attData = (await attRes.json()) as {
              items?: Array<{
                name?: string;
                display_name?: string;
                picture_url?: string;
                is_self?: number;
              }>;
            };
            const others = (attData.items || []).filter((a) => a.is_self !== 1);
            if (others.length > 0) {
              const names = others
                .map((a) => a.display_name || a.name || "")
                .filter(Boolean);
              if (names.length > 0) {
                conv.participants = names;
              }
              conv.pictureUrl = conv.pictureUrl || others[0].picture_url;
            }
          } catch {
            // Keep existing participant data on error
          }
        }),
      );
    }

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
// Get email conversations (threads) from /emails endpoint
// ---------------------------------------------------------------------------

export async function getUnipileEmailConversations(accountId: string): Promise<{
  conversations: Array<{
    id: string;
    accountId?: string;
    provider: string;
    participants: string[];
    pictureUrl?: string;
    lastMessage?: string;
    lastMessageAt?: string;
    unreadCount: number;
    isEmail?: boolean;
  }>;
  error?: string;
}> {
  try {
    await requireAuth();
    const dsn = process.env.UNIPILE_DSN;
    const apiKey = process.env.UNIPILE_API_KEY;
    if (!dsn || !apiKey) return { conversations: [], error: "Unipile non configuré" };

    const res = await fetch(
      `${dsn}/api/v1/emails?account_id=${accountId}&limit=50&role=inbox`,
      { headers: { "X-API-KEY": apiKey } },
    );
    if (!res.ok) return { conversations: [], error: "Erreur récupération emails" };

    const data = await res.json();
    const items = (data as { items?: unknown[] }).items || [];

    // Group emails by thread_id to create "conversations"
    const threadMap = new Map<string, {
      id: string;
      subject: string;
      from: string;
      fromEmail: string;
      date: string;
      read: boolean;
      body?: string;
    }>();

    for (const email of items as Array<{
      id: string;
      thread_id?: string;
      subject?: string;
      date?: string;
      from_attendee?: { display_name?: string; identifier?: string };
      body?: string;
      read?: boolean;
    }>) {
      const threadId = email.thread_id || email.id;
      // Keep the most recent email per thread (API returns newest first)
      if (!threadMap.has(threadId)) {
        threadMap.set(threadId, {
          id: email.id,
          subject: email.subject || "(Sans objet)",
          from: email.from_attendee?.display_name || email.from_attendee?.identifier || "Inconnu",
          fromEmail: email.from_attendee?.identifier || "",
          date: email.date || "",
          read: email.read !== false,
          body: email.body,
        });
      }
    }

    const conversations = Array.from(threadMap.entries()).map(([threadId, thread]) => {
      // Extract domain from email for favicon/logo
      const emailDomain = thread.fromEmail.split("@")[1] || "";
      const pictureUrl = emailDomain
        ? `https://logo.clearbit.com/${emailDomain}`
        : undefined;

      return {
        id: `email_${thread.id}`,
        accountId,
        provider: "email",
        participants: [thread.from],
        pictureUrl,
        lastMessage: thread.subject,
        lastMessageAt: thread.date,
        unreadCount: thread.read ? 0 : 1,
        isEmail: true,
      };
    });

    return { conversations };
  } catch (err) {
    console.error("Unipile emails error:", err);
    return { conversations: [], error: "Erreur récupération emails" };
  }
}

// ---------------------------------------------------------------------------
// Get email thread messages
// ---------------------------------------------------------------------------

export async function getUnipileEmailMessages(emailId: string): Promise<{
  messages: Array<{
    id: string;
    text: string;
    sender: string;
    senderId: string;
    timestamp: string;
    isFromMe: boolean;
    subject?: string;
  }>;
  error?: string;
}> {
  try {
    await requireAuth();
    const dsn = process.env.UNIPILE_DSN;
    const apiKey = process.env.UNIPILE_API_KEY;
    if (!dsn || !apiKey) return { messages: [], error: "Unipile non configuré" };

    const res = await fetch(`${dsn}/api/v1/emails/${emailId}`, {
      headers: { "X-API-KEY": apiKey },
    });
    if (!res.ok) return { messages: [], error: "Erreur récupération email" };

    const email = await res.json() as {
      id: string;
      subject?: string;
      body?: string;
      body_plain?: string;
      date?: string;
      from_attendee?: { display_name?: string; identifier?: string };
      to_attendees?: Array<{ display_name?: string; identifier?: string }>;
    };

    // Strip HTML tags for plain text display
    const bodyText = email.body_plain || (email.body || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

    return {
      messages: [{
        id: email.id,
        text: bodyText,
        sender: email.from_attendee?.display_name || email.from_attendee?.identifier || "",
        senderId: email.from_attendee?.identifier || "",
        timestamp: email.date || "",
        isFromMe: false,
        subject: email.subject,
      }],
    };
  } catch (err) {
    console.error("Unipile email message error:", err);
    return { messages: [], error: "Erreur récupération email" };
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

    const items = Array.isArray(response)
      ? response
      : (response as { items?: unknown[] }).items || [];

    const messages = (
      items as Array<{
        id: string;
        text?: string;
        body?: string;
        sender?: { display_name?: string; id?: string };
        timestamp?: string;
        is_sender?: boolean;
      }>
    ).map((msg) => ({
      id: msg.id,
      text: msg.text || msg.body || "",
      sender: msg.sender?.display_name || "",
      senderId: msg.sender?.id || "",
      timestamp: msg.timestamp || "",
      isFromMe: msg.is_sender || false,
    }));

    // API returns newest first — reverse to show oldest first (chronological)
    messages.reverse();

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
// Get LinkedIn / Instagram conversations for Chat sidebar
// ---------------------------------------------------------------------------

export async function getUnipileSocialConversations(
  platform: "linkedin" | "instagram",
): Promise<
  Array<{
    id: string;
    prospect_id: string;
    prospect: {
      id: string;
      name: string;
      platform: string;
      profile_url: string | null;
    } | null;
    platform: string;
    messages: Array<{
      sender: string;
      content: string;
      type: string;
      timestamp: string;
    }>;
    last_message_at: string;
    unread_count: number;
  }>
> {
  try {
    // Auth check
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];

    const dsn = process.env.UNIPILE_DSN;
    const apiKey = process.env.UNIPILE_API_KEY;
    if (!dsn || !apiKey) return [];

    // Find account for this platform
    const client = getUnipileClient();
    if (!client) return [];

    const accountsRes = await client.account.getAll();
    const accounts = Array.isArray(accountsRes)
      ? accountsRes
      : (
          accountsRes as {
            items?: Array<{ id: string; type?: string; provider?: string }>;
          }
        ).items || [];

    const providerName = platform === "linkedin" ? "LINKEDIN" : "INSTAGRAM";
    const account = (
      accounts as Array<{ id: string; type?: string; provider?: string }>
    ).find((a) => (a.type || a.provider || "").toUpperCase() === providerName);
    if (!account) return [];

    // Fetch chats
    const chatsRes = await fetch(
      `${dsn}/api/v1/chats?account_id=${account.id}&limit=50`,
      {
        headers: { "X-API-KEY": apiKey, Accept: "application/json" },
      },
    );
    if (!chatsRes.ok) return [];
    const chatsData = await chatsRes.json();
    const chats = (chatsData.items || []) as Array<{
      id: string;
      name?: string | null;
      timestamp?: string;
      unread_count?: number;
      attendee_provider_id?: string;
      attendee_public_identifier?: string;
      provider_id?: string;
    }>;

    // Fetch attendees for each chat (parallel, max 30)
    const chatsToProcess = chats.slice(0, 30);

    const [attendeesResults, messagesResults] = await Promise.all([
      // Fetch attendees
      Promise.all(
        chatsToProcess.map(async (chat) => {
          try {
            const res = await fetch(
              `${dsn}/api/v1/chats/${chat.id}/attendees`,
              {
                headers: { "X-API-KEY": apiKey, Accept: "application/json" },
              },
            );
            if (!res.ok) return [];
            const data = await res.json();
            return (data.items || []) as Array<{
              name?: string;
              is_self?: number;
              picture_url?: string;
              profile_url?: string;
              specifics?: { occupation?: string };
            }>;
          } catch {
            return [];
          }
        }),
      ),
      // Fetch last message
      Promise.all(
        chatsToProcess.map(async (chat) => {
          try {
            const res = await fetch(
              `${dsn}/api/v1/chats/${chat.id}/messages?limit=1`,
              {
                headers: { "X-API-KEY": apiKey, Accept: "application/json" },
              },
            );
            if (!res.ok) return null;
            const data = await res.json();
            const msg = data.items?.[0];
            return msg
              ? {
                  text: msg.text || null,
                  is_sender: !!msg.is_sender,
                  timestamp: msg.timestamp || chat.timestamp,
                  attachments: msg.attachments || [],
                }
              : null;
          } catch {
            return null;
          }
        }),
      ),
    ]);

    return chatsToProcess
      .map((chat, idx) => {
        const attendees = attendeesResults[idx];
        const otherAttendee = attendees.find((a) => !a.is_self);
        const contactName = otherAttendee?.name || chat.name || "Contact";
        const profileUrl = otherAttendee?.profile_url || null;
        const lastMsg = messagesResults[idx];
        const lastMsgTime =
          lastMsg?.timestamp || chat.timestamp || new Date().toISOString();

        const messages: Array<{
          sender: string;
          content: string;
          type: string;
          timestamp: string;
        }> = [];
        if (lastMsg) {
          const hasAttachment =
            lastMsg.attachments && lastMsg.attachments.length > 0;
          const content =
            lastMsg.text ||
            (hasAttachment
              ? `[${lastMsg.attachments[0]?.type || "pièce jointe"}]`
              : "");
          messages.push({
            sender: lastMsg.is_sender ? "me" : "prospect",
            content,
            type: "text",
            timestamp: lastMsgTime,
          });
        }

        return {
          id: `unipile-${chat.id}`,
          prospect_id: `unipile-${chat.id}`,
          prospect: {
            id: `unipile-${chat.id}`,
            name: contactName,
            platform,
            profile_url: profileUrl,
          },
          platform,
          messages,
          last_message_at: lastMsgTime,
          unread_count: chat.unread_count || 0,
        };
      })
      .sort(
        (a, b) =>
          new Date(b.last_message_at).getTime() -
          new Date(a.last_message_at).getTime(),
      );
  } catch (err) {
    console.error(`Unipile ${platform} conversations error:`, err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// LinkedIn: get profile
// ---------------------------------------------------------------------------

export async function getLinkedInProfileViaUnipile(
  accountId: string,
  profileUrl: string,
): Promise<{
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
        name:
          [profile.first_name, profile.last_name].filter(Boolean).join(" ") ||
          identifier,
        headline: profile.headline || null,
        profile_url: profileUrl,
        company: profile.company || null,
        location: profile.location || null,
        source: "unipile",
      },
    };
  } catch (err) {
    console.error("Unipile LinkedIn profile error:", err);
    return {
      error:
        err instanceof Error ? err.message : "Erreur de récupération profil",
    };
  }
}

// ---------------------------------------------------------------------------
// LinkedIn: send connection invitation
// ---------------------------------------------------------------------------

export async function sendLinkedInInvitation(
  profileIdentifier: string,
  message?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAuth();
    const client = getUnipileClient();
    if (!client) return { success: false, error: "Unipile non configuré" };

    // Find the LinkedIn account ID
    const response = await client.account.getAll();
    const items = Array.isArray(response)
      ? response
      : (response as { items?: unknown[] }).items || [];
    const liAccount = (
      items as Array<{ id: string; type?: string; provider?: string }>
    ).find((a) => (a.type || a.provider || "").toUpperCase() === "LINKEDIN");

    if (!liAccount) {
      return { success: false, error: "Aucun compte LinkedIn connecté" };
    }

    // Extract vanity name from URL if needed
    const vanityMatch = profileIdentifier.match(
      /linkedin\.com\/in\/([^/?#]+)/,
    );
    const providerId = vanityMatch?.[1] || profileIdentifier;

    await client.users.sendInvitation({
      account_id: liAccount.id,
      provider_id: providerId,
      ...(message ? { message } : {}),
    });

    return { success: true };
  } catch (err) {
    console.error("Unipile LinkedIn invitation error:", err);
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "Erreur lors de l'envoi de l'invitation",
    };
  }
}

// ---------------------------------------------------------------------------
// Calendar: list events (via REST — not in SDK)
// ---------------------------------------------------------------------------

export async function getUnipileCalendarEvents(
  accountId: string,
  params?: {
    start?: string;
    end?: string;
  },
): Promise<{
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
    const apiKey =
      process.env.UNIPILE_API_KEY || (await getApiKey("UNIPILE_API_KEY"));
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

    const events = (
      items as Array<{
        id: string;
        title?: string;
        summary?: string;
        start?: { date_time?: string; date?: string };
        end?: { date_time?: string; date?: string };
        attendees?: Array<{ email?: string; display_name?: string }>;
        location?: string;
        description?: string;
      }>
    ).map((evt) => ({
      id: evt.id,
      title: evt.title || evt.summary || "Sans titre",
      start: evt.start?.date_time || evt.start?.date || "",
      end: evt.end?.date_time || evt.end?.date || "",
      attendees: (evt.attendees || []).map(
        (a) => a.display_name || a.email || "",
      ),
      location: evt.location || null,
      description: evt.description || null,
    }));

    return { events };
  } catch (err) {
    console.error("Unipile calendar events error:", err);
    return {
      events: [],
      error:
        err instanceof Error
          ? err.message
          : "Erreur de récupération calendrier",
    };
  }
}

// ---------------------------------------------------------------------------
// Calendar: create event (via REST)
// ---------------------------------------------------------------------------

export async function createUnipileCalendarEvent(
  accountId: string,
  event: {
    title: string;
    start: string;
    end: string;
    description?: string;
    location?: string;
    attendees?: string[];
  },
): Promise<{ eventId?: string; error?: string }> {
  try {
    await requireAuth();

    const dsn = process.env.UNIPILE_DSN || (await getApiKey("UNIPILE_DSN"));
    const apiKey =
      process.env.UNIPILE_API_KEY || (await getApiKey("UNIPILE_API_KEY"));
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
    return {
      error:
        err instanceof Error ? err.message : "Erreur de création événement",
    };
  }
}

// ---------------------------------------------------------------------------
// Webhook handler
// ---------------------------------------------------------------------------

export async function handleUnipileWebhook(
  body: Record<string, unknown>,
): Promise<void> {
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
          .or(
            `instagram_id.eq.${senderId},profile_url.ilike.%${senderId}%,phone.eq.${senderId}`,
          )
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

      // Reply detection: cancel pending relance workflows for this prospect
      if (prospectId) {
        try {
          await supabase
            .from("relance_workflows")
            .update({
              status: "responded",
              responded_at: new Date().toISOString(),
            })
            .eq("prospect_id", prospectId)
            .eq("status", "pending");

          // Update prospect status to "replied" if currently "contacted"
          await supabase
            .from("prospects")
            .update({ status: "replied" })
            .eq("id", prospectId)
            .eq("status", "contacted");
        } catch {
          // Non-critical — don't block webhook processing
        }
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
      break;

    default:
      break;
  }
}
