"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { aiJSON } from "@/lib/ai/client";

export async function getConversations(search?: string) {
  const supabase = await createClient();
  const query = supabase
    .from("dm_conversations")
    .select("*, prospect:prospects(id, name, platform, profile_url, status)")
    .order("last_message_at", { ascending: false });

  const { data } = await query;
  let conversations = (data || []).map((d: Record<string, unknown>) => ({
    ...d,
    prospect: Array.isArray(d.prospect) ? d.prospect[0] || null : d.prospect,
  }));

  if (search) {
    conversations = conversations.filter((c: Record<string, unknown>) => {
      const prospect = c.prospect as { name?: string } | null;
      return prospect?.name?.toLowerCase().includes(search.toLowerCase());
    });
  }

  return conversations;
}

export async function getConversation(id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("dm_conversations")
    .select("*, prospect:prospects(id, name, platform, profile_url, status)")
    .eq("id", id)
    .single();

  if (!data) return null;
  return {
    ...data,
    prospect: Array.isArray(data.prospect)
      ? data.prospect[0] || null
      : data.prospect,
  };
}

export async function sendMessage(
  conversationId: string,
  content: string,
  type: string = "text",
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  // Get sender name from profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  const senderName = profile?.full_name || user.email?.split("@")[0] || "moi";

  const { data: conv } = await supabase
    .from("dm_conversations")
    .select("messages, linkedin_conversation_id")
    .eq("id", conversationId)
    .single();

  if (!conv) return;

  const isLinkedIn = !!conv.linkedin_conversation_id;
  const messages = Array.isArray(conv.messages) ? conv.messages : [];

  const newMessage: Record<string, unknown> = {
    sender: senderName,
    content,
    type,
    timestamp: new Date().toISOString(),
  };

  // Si conversation LinkedIn, marquer pour envoi par l'extension Chrome
  if (isLinkedIn) {
    newMessage.pending_send = true;
  }

  messages.push(newMessage);

  const { error } = await supabase
    .from("dm_conversations")
    .update({
      messages,
      last_message_at: new Date().toISOString(),
    })
    .eq("id", conversationId);

  if (error) {
    throw new Error("Échec de l'envoi du message");
  }

  revalidatePath("/inbox");
}

export async function createConversation(
  prospectId: string,
  platform: string = "instagram",
) {
  const supabase = await createClient();

  // Check if conversation already exists
  const { data: existing } = await supabase
    .from("dm_conversations")
    .select("id")
    .eq("prospect_id", prospectId)
    .single();

  if (existing) return existing.id;

  const { data } = await supabase
    .from("dm_conversations")
    .insert({
      prospect_id: prospectId,
      platform,
      messages: [],
      last_message_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  revalidatePath("/inbox");
  return data?.id;
}

export async function importConversation(
  prospectId: string,
  platform: string,
  rawText: string,
) {
  const supabase = await createClient();

  // Get sender name from profile
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single()
    : { data: null };
  const senderName = profile?.full_name || "moi";

  // Get prospect name
  const { data: prospect } = await supabase
    .from("prospects")
    .select("name")
    .eq("id", prospectId)
    .single();
  const prospectName = prospect?.name || "prospect";

  // Parse raw text into messages (simple line-by-line parsing)
  const lines = rawText.split("\n").filter((l) => l.trim());
  const messages = lines.map((line, i) => ({
    sender: i % 2 === 0 ? prospectName : senderName,
    content: line.trim(),
    type: "text",
    timestamp: new Date(Date.now() - (lines.length - i) * 60000).toISOString(),
  }));

  const convId = await createConversation(prospectId, platform);
  if (!convId) return;

  await supabase
    .from("dm_conversations")
    .update({
      messages,
      last_message_at: new Date().toISOString(),
    })
    .eq("id", convId);

  revalidatePath("/inbox");
  return convId;
}

export async function uploadVoiceMessage(
  conversationId: string,
  audioUrl: string,
) {
  await sendMessage(conversationId, audioUrl, "voice");
}

export async function generateQuickReplies(
  conversationContext: string,
  prospectName: string,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { suggestions: [] };

  try {
    const parsed = await aiJSON<{ suggestions: string[] }>(
      `Contexte de la conversation avec ${prospectName}:\n${conversationContext}\n\nGénère 3 suggestions de réponse.`,
      {
        system:
          'Tu es un expert en setting (prospection commerciale). Génère exactement 3 réponses courtes et naturelles à envoyer au prospect. Format JSON: {"suggestions": ["msg1", "msg2", "msg3"]}. Tutoiement. Max 2 phrases par suggestion. En français.',
        maxTokens: 512,
      },
    );
    return { suggestions: parsed.suggestions || [] };
  } catch {
    return {
      suggestions: [],
      error: "Suggestions IA indisponibles — réessayez dans quelques instants.",
    };
  }
}
