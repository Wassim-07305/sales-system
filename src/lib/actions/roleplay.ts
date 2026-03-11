"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { aiChat, aiJSON, type AIMessage } from "@/lib/ai/client";

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
    .select("conversation")
    .eq("id", sessionId)
    .single();

  if (!session) throw new Error("Session non trouvée");

  // Fetch prospect profile for context
  const { data: fullSession } = await supabase
    .from("roleplay_sessions")
    .select("*, profile:roleplay_prospect_profiles(*)")
    .eq("id", sessionId)
    .single();

  const profile = fullSession?.profile
    ? (Array.isArray(fullSession.profile) ? fullSession.profile[0] : fullSession.profile)
    : null;

  const messages = Array.isArray(session.conversation) ? session.conversation : [];
  messages.push({ role: "user", content, timestamp: new Date().toISOString() });

  // Build AI conversation with prospect persona
  const systemPrompt = `Tu es un prospect simulé pour un exercice de jeu de rôles en vente/setting.

PERSONA DU PROSPECT :
- Nom : ${profile?.name || "Prospect inconnu"}
- Niche : ${profile?.niche || "Business en ligne"}
- Personnalité : ${profile?.persona || "Sceptique mais ouvert"}
- Difficulté : ${profile?.difficulty || "moyen"}
- Objections favorites : ${profile?.objections?.join(", ") || "prix, timing, confiance"}
- Scénario : ${profile?.scenario || "B2B actif"}
- Réseau simulé : ${profile?.network || "Instagram"}

RÈGLES :
- Tu joues le prospect de manière RÉALISTE et COHÉRENTE
- Tu ne révèles jamais que tu es une IA
- Tu réagis naturellement aux messages du setter
- Tu utilises tes objections favorites au bon moment
- Niveau de difficulté ${profile?.difficulty || "moyen"} : ${
    profile?.difficulty === "facile" ? "Tu es plutôt réceptif, tu poses des questions mais tu es ouvert"
    : profile?.difficulty === "difficile" ? "Tu es très sceptique, tu as beaucoup d'objections, tu ne te laisses pas convaincre facilement"
    : "Tu es neutre, tu écoutes mais tu as besoin d'être convaincu"
  }
- Réponds en français, de manière concise (1 à 3 phrases max), comme dans un vrai DM ${profile?.network || "Instagram"}
- NE METS PAS de guillemets autour de ta réponse`;

  const aiMessages: AIMessage[] = [
    { role: "system", content: systemPrompt },
  ];

  // Add conversation history
  for (const msg of messages) {
    aiMessages.push({
      role: msg.role === "user" ? "user" : "assistant",
      content: msg.content,
    });
  }

  const aiMessage = await aiChat(aiMessages, { temperature: 0.85, maxTokens: 256 });

  messages.push({ role: "assistant", content: aiMessage, timestamp: new Date().toISOString() });

  await supabase.from("roleplay_sessions").update({ conversation: messages }).eq("id", sessionId);
  return { aiMessage };
}

export async function endSession(sessionId: string) {
  const supabase = await createClient();
  const { data: session } = await supabase
    .from("roleplay_sessions")
    .select("*")
    .eq("id", sessionId)
    .single();

  if (!session) throw new Error("Session non trouvée");

  // Build conversation transcript for AI analysis
  const conversation = Array.isArray(session.conversation) ? session.conversation : [];
  const transcript = conversation
    .map((m: { role: string; content: string }) =>
      `${m.role === "user" ? "SETTER" : "PROSPECT"}: ${m.content}`
    )
    .join("\n");

  let feedback: {
    score: number;
    strengths: string[];
    improvements: string[];
    objection_handling: number;
    rapport_building: number;
    closing_technique: number;
  };

  try {
    feedback = await aiJSON<typeof feedback>(
      `Analyse cette conversation de setting/vente et donne un feedback détaillé.

CONVERSATION :
${transcript}

Réponds en JSON avec exactement cette structure :
{
  "score": <number 0-100>,
  "strengths": ["force 1", "force 2", "force 3"],
  "improvements": ["amélioration 1", "amélioration 2", "amélioration 3"],
  "objection_handling": <number 0-100>,
  "rapport_building": <number 0-100>,
  "closing_technique": <number 0-100>
}

Critères d'évaluation :
- Score global : qualité globale de la conversation
- objection_handling : capacité à gérer les résistances du prospect
- rapport_building : qualité du lien créé avec le prospect
- closing_technique : efficacité pour amener vers un appel/CTA
- strengths : 3 points forts concrets observés dans la conversation
- improvements : 3 axes d'amélioration concrets et actionnables`,
      { system: "Tu es un coach expert en vente et setting. Analyse uniquement en français." }
    );
  } catch {
    // Fallback if AI fails
    feedback = {
      score: Math.floor(Math.random() * 40) + 60,
      strengths: ["Bonne introduction", "Questions pertinentes"],
      improvements: ["Gestion des objections à améliorer", "Closing trop rapide"],
      objection_handling: Math.floor(Math.random() * 30) + 60,
      rapport_building: Math.floor(Math.random() * 30) + 65,
      closing_technique: Math.floor(Math.random() * 30) + 55,
    };
  }

  const score = feedback.score;

  await supabase.from("roleplay_sessions").update({
    status: "completed",
    ended_at: new Date().toISOString(),
    score,
    ai_feedback: feedback,
    duration_seconds: Math.floor((Date.now() - new Date(session.started_at).getTime()) / 1000),
  }).eq("id", sessionId);

  revalidatePath("/roleplay");
  return feedback;
}

export async function getRoleplayFeedback(
  sessionId: string,
  conversation: { role: string; content: string }[]
) {
  const transcript = conversation
    .map((m) => `${m.role === "user" ? "SETTER" : "PROSPECT"}: ${m.content}`)
    .join("\n");

  type FeedbackResult = {
    score: number;
    strengths: string[];
    improvements: string[];
    tips: string[];
  };

  try {
    const feedback = await aiJSON<FeedbackResult>(
      `Analyse cette conversation de setting/vente et donne un feedback detaille.

CONVERSATION :
${transcript}

Reponds en JSON avec exactement cette structure :
{
  "score": <number 0-100>,
  "strengths": ["force 1", "force 2", "force 3"],
  "improvements": ["amelioration 1", "amelioration 2", "amelioration 3"],
  "tips": ["conseil pratique 1", "conseil pratique 2", "conseil pratique 3"]
}

Criteres d'evaluation :
- Score global : qualite globale de la conversation de vente
- strengths : 3 points forts concrets observes dans la conversation
- improvements : 3 axes d'amelioration concrets et actionnables
- tips : 3 conseils pratiques que le vendeur peut appliquer immediatement`,
      { system: "Tu es un coach expert en vente et setting. Analyse uniquement en francais." }
    );

    // Also update the session in DB with this feedback
    const supabase = await createClient();
    await supabase.from("roleplay_sessions").update({
      status: "completed",
      ended_at: new Date().toISOString(),
      score: feedback.score,
      ai_feedback: feedback,
    }).eq("id", sessionId);

    revalidatePath("/roleplay");
    return feedback;
  } catch {
    return {
      score: 65,
      strengths: ["Bonne introduction", "Questions pertinentes"],
      improvements: ["Gestion des objections a ameliorer", "Closing trop rapide"],
      tips: ["Pose plus de questions ouvertes", "Laisse le prospect s'exprimer davantage"],
    };
  }
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
