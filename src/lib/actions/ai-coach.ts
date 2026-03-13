"use server";

import { createClient } from "@/lib/supabase/server";
import { aiChat } from "@/lib/ai/client";

export async function askAiCoach(question: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  if (!question.trim()) return { error: "Question vide" };

  // Fetch user's profile for context
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  // Fetch recent course content for RAG-like context
  const { data: courses } = await supabase
    .from("courses")
    .select("title, description")
    .limit(10);

  // Fetch recent community posts for FAQ
  const { data: faqPosts } = await supabase
    .from("community_posts")
    .select("title, content")
    .order("created_at", { ascending: false })
    .limit(5);

  const courseContext = (courses || []).map(c => `- ${c.title}: ${c.description}`).join("\n");
  const faqContext = (faqPosts || []).map(p => `Q: ${p.title}\nR: ${p.content?.slice(0, 200)}`).join("\n");

  // Build system prompt for AI coach
  const systemPrompt = `Tu es l'assistant IA de S Academy, une plateforme de formation au setting (prospection commerciale sur les réseaux sociaux).

Tu aides les setters et clients avec :
- Les techniques de setting (prospection Instagram, LinkedIn, WhatsApp)
- Le contenu des modules de formation
- Les scripts de prospection et objections
- Les bonnes pratiques de CRM et suivi
- La motivation et le mindset commercial

Contexte des formations disponibles :
${courseContext}

Questions fréquentes récentes :
${faqContext}

L'utilisateur s'appelle ${profile?.full_name || "l'utilisateur"} et a le rôle ${profile?.role || "setter"}.

Réponds de manière concise, actionnable et encourageante. Utilise le tutoiement. Max 300 mots.`;

  // Store the conversation
  const { data: conversation } = await supabase
    .from("ai_coach_conversations")
    .insert({
      user_id: user.id,
      question,
      answer: "",
    })
    .select("id")
    .single();

  // Call AI via OpenRouter
  let answer: string;
  try {
    answer = await aiChat(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: question },
      ],
      { maxTokens: 1024, temperature: 0.7 }
    );
    if (!answer) {
      console.warn("[AI Coach] Réponse vide de OpenRouter, utilisation du fallback");
      answer = getSmartFallback(question);
    }
  } catch (err) {
    console.error("[AI Coach] Erreur appel IA:", err instanceof Error ? err.message : err);
    // Return error info to help debug, not just a generic fallback
    const errorMsg = err instanceof Error ? err.message : "Erreur inconnue";
    if (errorMsg.includes("non configurée")) {
      answer = "⚠️ L'assistant IA n'est pas encore configuré. Demande à ton administrateur d'ajouter la clé API OpenRouter dans Paramètres > Intégrations.";
    } else {
      answer = getSmartFallback(question);
    }
  }

  // Update conversation with answer
  if (conversation) {
    await supabase
      .from("ai_coach_conversations")
      .update({ answer })
      .eq("id", conversation.id);
  }

  return { answer, conversationId: conversation?.id };
}

function getSmartFallback(question: string): string {
  const q = question.toLowerCase();
  if (q.includes("script") || q.includes("message")) {
    return "Pour tes scripts de prospection, la clé est la personnalisation. Commence toujours par un élément spécifique au profil de la personne (dernier post, bio, activité). Évite les messages génériques. Consulte la bibliothèque de scripts dans la section Scripts pour des exemples concrets.";
  }
  if (q.includes("relance") || q.includes("follow")) {
    return "Pour les relances, attends 48h après le premier message. Si pas de réponse, envoie un message de valeur (pas juste \"tu as vu mon message ?\"). Après 5 jours, tente un angle différent. Consulte le module sur les relances pour plus de détails.";
  }
  if (q.includes("objection") || q.includes("prix") || q.includes("cher")) {
    return "Face aux objections, ne te justifie jamais. Reformule la question : \"Je comprends, qu'est-ce qui te ferait dire que c'est un bon investissement ?\". Consulte le module Objections dans l'Académie pour les frameworks complets.";
  }
  if (q.includes("motivation") || q.includes("dur") || q.includes("difficile")) {
    return "Les périodes difficiles sont normales. Rappelle-toi pourquoi tu as commencé. Fixe-toi un micro-objectif pour aujourd'hui : 5 DMs, pas 50. La constance bat l'intensité. Tu as accès au simulateur de revenus pour visualiser tes objectifs.";
  }
  return "Bonne question ! Je te recommande de consulter les modules de formation dans l'Académie pour une réponse détaillée, ou de poser ta question dans le forum communautaire où d'autres setters pourront aussi partager leur expérience. N'hésite pas à être plus spécifique dans ta question.";
}

export async function getCoachHistory(limit = 20) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("ai_coach_conversations")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  return data || [];
}
