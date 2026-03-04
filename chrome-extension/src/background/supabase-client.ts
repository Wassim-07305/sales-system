import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getAuth, setAuth } from "../shared/storage";

let client: SupabaseClient | null = null;

export async function getSupabaseClient(): Promise<SupabaseClient | null> {
  const auth = await getAuth();
  if (!auth.supabaseUrl || !auth.supabaseAnonKey) return null;

  if (!client) {
    client = createClient(auth.supabaseUrl, auth.supabaseAnonKey, {
      auth: { persistSession: false },
    });
  }

  if (auth.accessToken) {
    await client.auth.setSession({
      access_token: auth.accessToken,
      refresh_token: auth.refreshToken || "",
    });
  }

  return client;
}

export async function loginToSupabase(
  email: string,
  password: string,
  supabaseUrl: string,
  supabaseAnonKey: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const sb = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
    });

    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) return { success: false, error: error.message };

    await setAuth({
      supabaseUrl,
      supabaseAnonKey,
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      userId: data.user.id,
      isAuthenticated: true,
    });

    client = sb;
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function logoutSupabase(): Promise<void> {
  if (client) {
    await client.auth.signOut();
    client = null;
  }
  await setAuth({
    supabaseUrl: null,
    supabaseAnonKey: null,
    accessToken: null,
    refreshToken: null,
    userId: null,
    isAuthenticated: false,
  });
}

export async function upsertProspect(data: {
  name: string;
  profile_url: string;
  platform: string;
}): Promise<{ id: string } | null> {
  const sb = await getSupabaseClient();
  if (!sb) return null;

  // Try to find existing prospect first
  const { data: existing } = await sb
    .from("prospects")
    .select("id")
    .eq("profile_url", data.profile_url)
    .maybeSingle();

  if (existing) return { id: existing.id };

  // INSERT without .select() — the SELECT RLS policy may be missing,
  // which causes .insert().select() to fail with 42501.
  const { error } = await sb.from("prospects").insert({
    name: data.name,
    profile_url: data.profile_url,
    platform: data.platform,
    status: "new",
  });

  if (error) {
    console.error("[SS] Error inserting prospect:", error);
    return null;
  }

  // Fetch the ID of the newly inserted prospect
  const { data: created } = await sb
    .from("prospects")
    .select("id")
    .eq("profile_url", data.profile_url)
    .maybeSingle();

  return created;
}

export async function getProspectByUrl(profileUrl: string): Promise<{ id: string } | null> {
  const sb = await getSupabaseClient();
  if (!sb) return null;

  const { data } = await sb
    .from("prospects")
    .select("id")
    .eq("profile_url", profileUrl)
    .single();

  return data;
}

export async function getConversationByLinkedinId(
  linkedinConversationId: string
): Promise<{ id: string; messages: Array<Record<string, unknown>> } | null> {
  const sb = await getSupabaseClient();
  if (!sb) return null;

  const { data } = await sb
    .from("dm_conversations")
    .select("id, messages")
    .eq("linkedin_conversation_id", linkedinConversationId)
    .single();

  return data;
}

export async function upsertConversation(data: {
  prospect_id: string;
  linkedin_conversation_id: string;
  platform: string;
  messages: Array<{ sender: string; content: string; type: string; timestamp: string }>;
}): Promise<string | null> {
  const sb = await getSupabaseClient();
  if (!sb) return null;

  const existing = await getConversationByLinkedinId(data.linkedin_conversation_id);

  if (existing) {
    await sb
      .from("dm_conversations")
      .update({
        messages: data.messages,
        last_message_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
    return existing.id;
  }

  const { data: inserted, error } = await sb
    .from("dm_conversations")
    .insert({
      prospect_id: data.prospect_id,
      linkedin_conversation_id: data.linkedin_conversation_id,
      platform: data.platform,
      messages: data.messages,
      last_message_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    console.error("[SS] Error inserting conversation:", error);
    return null;
  }
  return inserted.id;
}

export async function getPendingMessages(): Promise<
  Array<{
    conversationDbId: string;
    linkedinConversationId: string;
    messageIndex: number;
    content: string;
  }>
> {
  const sb = await getSupabaseClient();
  if (!sb) return [];

  const { data: conversations } = await sb
    .from("dm_conversations")
    .select("id, linkedin_conversation_id, messages")
    .eq("platform", "linkedin")
    .not("linkedin_conversation_id", "is", null);

  if (!conversations) return [];

  const pending: Array<{
    conversationDbId: string;
    linkedinConversationId: string;
    messageIndex: number;
    content: string;
  }> = [];

  for (const conv of conversations) {
    const messages = conv.messages as Array<Record<string, unknown>>;
    messages.forEach((msg, idx) => {
      if (msg.pending_send === true && msg.sender === "damien") {
        pending.push({
          conversationDbId: conv.id,
          linkedinConversationId: conv.linkedin_conversation_id,
          messageIndex: idx,
          content: msg.content as string,
        });
      }
    });
  }

  return pending;
}

export async function markMessageSent(
  conversationId: string,
  messageIndex: number
): Promise<void> {
  const sb = await getSupabaseClient();
  if (!sb) return;

  const { data: conv } = await sb
    .from("dm_conversations")
    .select("messages")
    .eq("id", conversationId)
    .single();

  if (!conv) return;

  const messages = conv.messages as Array<Record<string, unknown>>;
  if (messages[messageIndex]) {
    messages[messageIndex].pending_send = false;
    messages[messageIndex].sent_at = new Date().toISOString();
  }

  await sb
    .from("dm_conversations")
    .update({ messages })
    .eq("id", conversationId);
}
