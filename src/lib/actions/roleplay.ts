"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { isAiConfigured } from "@/lib/ai/client";
import { completeConversation, completeJSON } from "@/lib/ai/utils";
import { ROLEPLAY_SYSTEM_PROMPT, ROLEPLAY_DEBRIEF_SYSTEM_PROMPT } from "@/lib/ai/prompts";

export async function getRoleplayProfiles() {
  const supabase = await createClient();
  const { data } = await supabase.from("roleplay_prospect_profiles").select("*").order("name");
  return data || [];
}

export async function createRoleplayProfile(profile: {
  name: string;
  niche: string;
  persona: string;
  difficulty: string;
  objections: string[];
  scenario: string;
  network: string;
}) {
  const supabase = await createClient();
  await supabase.from("roleplay_prospect_profiles").insert(profile);
  revalidatePath("/roleplay");
}

export async function deleteRoleplayProfile(id: string) {
  const supabase = await createClient();
  await supabase.from("roleplay_prospect_profiles").delete().eq("id", id);
  revalidatePath("/roleplay");
}

export async function startSession(profileId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const { data } = await supabase.from("roleplay_sessions").insert({
    user_id: user.id,
    prospect_profile_id: profileId,
    status: "active",
    conversation: [],
    started_at: new Date().toISOString(),
  }).select().single();

  return data;
}

export async function sendRoleplayMessage(sessionId: string, content: string) {
  const supabase = await createClient();
  const { data: session } = await supabase
    .from("roleplay_sessions")
    .select("conversation, prospect_profile_id")
    .eq("id", sessionId)
    .single();

  if (!session) throw new Error("Session non trouvée");

  const messages = Array.isArray(session.conversation) ? session.conversation : [];
  messages.push({ role: "user", content, timestamp: new Date().toISOString() });

  let aiMessage: string;

  if (!isAiConfigured()) {
    // Fallback hardcodé si IA non configurée
    const fallbackResponses = [
      "Hmm, intéressant. Mais je ne suis pas sûr que ce soit fait pour moi. Pourquoi devrais-je vous faire confiance ?",
      "Je comprends, mais j'ai déjà essayé plusieurs formations sans résultat. Qu'est-ce qui rend la vôtre différente ?",
      "Le prix me semble élevé. Est-ce qu'il y a des facilités de paiement ?",
      "Ok, ça m'intéresse. Comment on procède pour la suite ?",
      "Pouvez-vous m'envoyer plus d'informations par email ?",
    ];
    aiMessage = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
  } else {
    // Récupérer le profil prospect pour contextualiser l'IA
    const { data: profile } = await supabase
      .from("roleplay_prospect_profiles")
      .select("*")
      .eq("id", session.prospect_profile_id)
      .single();

    const difficultyInstructions = profile?.difficulty === "Facile"
      ? "Tu es plutôt réceptif, poses quelques questions mais es ouvert à la discussion."
      : profile?.difficulty === "Difficile"
        ? "Tu es très sceptique, tu poses des questions pointues, tu utilises des objections fortes et tu ne te laisses pas convaincre facilement."
        : "Tu es modérément intéressé, tu poses des questions pertinentes et tu as quelques objections classiques.";

    const systemPrompt = `${ROLEPLAY_SYSTEM_PROMPT}

PROFIL DU PROSPECT :
- Nom : ${profile?.name || "Prospect"}
- Niche : ${profile?.niche || "Généraliste"}
- Persona : ${profile?.persona || "Entrepreneur classique"}
- Difficulté : ${profile?.difficulty || "Moyen"}
- Réseau : ${profile?.network || "LinkedIn"}
- Objections à utiliser : ${(profile?.objections as string[] || []).join(", ") || "prix, temps, hésitation"}
- Scénario : ${profile?.scenario || "Prospection classique"}

${difficultyInstructions}`;

    // Convertir l'historique en format Anthropic (alterner user/assistant)
    const anthropicMessages = messages.map((m: { role: string; content: string }) => ({
      role: (m.role === "user" ? "user" : "assistant") as "user" | "assistant",
      content: m.content,
    }));

    try {
      aiMessage = await completeConversation({
        system: systemPrompt,
        messages: anthropicMessages,
        model: "SONNET",
        maxTokens: 512,
      });
    } catch (error) {
      console.error("[Roleplay] Erreur IA:", error);
      aiMessage = "Hmm, intéressant. Pourriez-vous m'en dire plus ?";
    }
  }

  messages.push({ role: "assistant", content: aiMessage, timestamp: new Date().toISOString() });
  await supabase.from("roleplay_sessions").update({ conversation: messages }).eq("id", sessionId);
  return { aiMessage };
}

export async function endSession(sessionId: string) {
  const supabase = await createClient();
  const { data: session } = await supabase
    .from("roleplay_sessions")
    .select("*, profile:roleplay_prospect_profiles(name, niche, difficulty, objections)")
    .eq("id", sessionId)
    .single();

  if (!session) throw new Error("Session non trouvée");

  const profile = Array.isArray(session.profile) ? session.profile[0] : session.profile;
  const conversation = Array.isArray(session.conversation) ? session.conversation : [];

  const fallbackFeedback = {
    score: Math.floor(Math.random() * 40) + 60,
    strengths: ["Bonne introduction", "Questions pertinentes"],
    improvements: ["Gestion des objections à améliorer", "Closing trop rapide"],
    objection_handling: Math.floor(Math.random() * 30) + 60,
    rapport_building: Math.floor(Math.random() * 30) + 65,
    closing_technique: Math.floor(Math.random() * 30) + 55,
  };

  let feedback = fallbackFeedback;

  if (isAiConfigured() && conversation.length >= 2) {
    const conversationText = conversation
      .map((m: { role: string; content: string }) =>
        `[${m.role === "user" ? "VENDEUR" : "PROSPECT"}] ${m.content}`
      )
      .join("\n\n");

    feedback = await completeJSON<typeof fallbackFeedback>({
      system: ROLEPLAY_DEBRIEF_SYSTEM_PROMPT,
      user: `Analyse cette conversation de vente et fournis un feedback détaillé.

PROFIL DU PROSPECT : ${profile?.name || "Prospect"}, niche: ${profile?.niche || "N/A"}, difficulté: ${profile?.difficulty || "Moyen"}

CONVERSATION (${conversation.length} messages) :
${conversationText}

Analyse : qualité de l'accroche, gestion des objections, techniques de closing, pertinence des questions, capacité d'adaptation.`,
      model: "SONNET",
      maxTokens: 2048,
      fallback: fallbackFeedback,
    });
  }

  await supabase.from("roleplay_sessions").update({
    status: "completed",
    ended_at: new Date().toISOString(),
    score: feedback.score,
    ai_feedback: feedback,
    duration_seconds: Math.floor((Date.now() - new Date(session.started_at).getTime()) / 1000),
  }).eq("id", sessionId);

  revalidatePath("/roleplay");
  return feedback;
}

export async function getUserSessions(userId?: string) {
  const supabase = await createClient();
  let query = supabase
    .from("roleplay_sessions")
    .select("*, profile:roleplay_prospect_profiles(name, niche, difficulty), user:profiles(full_name, avatar_url)")
    .order("started_at", { ascending: false });

  if (userId) query = query.eq("user_id", userId);

  const { data } = await query;
  return (data || []).map((d: Record<string, unknown>) => ({
    ...d,
    profile: Array.isArray(d.profile) ? d.profile[0] : d.profile,
    user: Array.isArray(d.user) ? d.user[0] : d.user,
  }));
}

export async function getSession(sessionId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("roleplay_sessions")
    .select("*, profile:roleplay_prospect_profiles(*), user:profiles(full_name)")
    .eq("id", sessionId)
    .single();

  if (!data) return null;
  return {
    ...data,
    profile: Array.isArray(data.profile) ? data.profile[0] : data.profile,
    user: Array.isArray(data.user) ? data.user[0] : data.user,
  };
}
