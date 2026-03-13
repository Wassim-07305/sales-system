"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

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
    prospect: Array.isArray(data.prospect) ? data.prospect[0] || null : data.prospect,
  };
}

export async function sendMessage(conversationId: string, content: string, type: string = "text") {
  const supabase = await createClient();

  const { data: conv } = await supabase
    .from("dm_conversations")
    .select("messages, linkedin_conversation_id")
    .eq("id", conversationId)
    .single();

  if (!conv) return;

  const isLinkedIn = !!conv.linkedin_conversation_id;
  const messages = Array.isArray(conv.messages) ? conv.messages : [];

  const newMessage: Record<string, unknown> = {
    sender: "damien",
    content,
    type,
    timestamp: new Date().toISOString(),
  };

  // Si conversation LinkedIn, marquer pour envoi par l'extension Chrome
  if (isLinkedIn) {
    newMessage.pending_send = true;
  }

  messages.push(newMessage);

  await supabase.from("dm_conversations").update({
    messages,
    last_message_at: new Date().toISOString(),
  }).eq("id", conversationId);

  revalidatePath("/inbox");
}

export async function createConversation(prospectId: string, platform: string = "instagram") {
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

export async function importConversation(prospectId: string, platform: string, rawText: string) {
  const supabase = await createClient();

  // Parse raw text into messages (simple line-by-line parsing)
  const lines = rawText.split("\n").filter((l) => l.trim());
  const messages = lines.map((line, i) => ({
    sender: i % 2 === 0 ? "prospect" : "damien",
    content: line.trim(),
    type: "text",
    timestamp: new Date(Date.now() - (lines.length - i) * 60000).toISOString(),
  }));

  const convId = await createConversation(prospectId, platform);
  if (!convId) return;

  await supabase.from("dm_conversations").update({
    messages,
    last_message_at: new Date().toISOString(),
  }).eq("id", convId);

  revalidatePath("/inbox");
  return convId;
}

export async function uploadVoiceMessage(conversationId: string, audioUrl: string) {
  await sendMessage(conversationId, audioUrl, "voice");
}

export async function generateQuickReplies(conversationContext: string, prospectName: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { suggestions: [] };

  try {
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (anthropicKey) {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 512,
          system: "Tu es un expert en setting (prospection commerciale). Génère exactement 3 réponses courtes et naturelles à envoyer au prospect. Format JSON: {\"suggestions\": [\"msg1\", \"msg2\", \"msg3\"]}. Tutoiement. Max 2 phrases par suggestion. En français.",
          messages: [{ role: "user", content: `Contexte de la conversation avec ${prospectName}:\n${conversationContext}\n\nGénère 3 suggestions de réponse.` }],
        }),
      });
      const result = await response.json();
      const text = result.content?.[0]?.text || "";
      const parsed = JSON.parse(text);
      return { suggestions: parsed.suggestions || [] };
    }
  } catch {
    // fallback
  }

  return {
    suggestions: [
      `Salut ${prospectName} ! Merci pour ta réponse. Est-ce que tu aurais 15 min cette semaine pour en discuter ?`,
      `Super intéressant ce que tu me dis. J'ai justement un client qui avait la même problématique, je peux te montrer comment on l'a résolu.`,
      `Je comprends ${prospectName}. Si tu veux, je t'envoie un cas concret par message pour que tu puisses voir les résultats avant de te décider.`,
    ],
  };
}
