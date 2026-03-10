"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { aiComplete, aiJSON } from "@/lib/ai/client";
import { computeScoreBreakdown } from "@/lib/scoring";

// ─── Multi-Network Overview ────────────────────────────────────────

export async function getMultiNetworkOverview() {
  const supabase = await createClient();

  const { data: prospects } = await supabase
    .from("prospects")
    .select("*, scores:prospect_scores(engagement_score)")
    .order("created_at", { ascending: false });

  const allProspects = (prospects || []).map((p: Record<string, unknown>) => ({
    ...p,
    scores: Array.isArray(p.scores) ? p.scores[0] || null : p.scores,
  }));

  const platforms = ["linkedin", "instagram"];
  const overview = platforms.map((platform) => {
    const filtered = allProspects.filter(
      (p: Record<string, unknown>) => p.platform === platform
    );
    const scores = filtered
      .map((p: Record<string, unknown>) => {
        const s = p.scores as Record<string, unknown> | null;
        return s?.engagement_score as number | undefined;
      })
      .filter((s): s is number => typeof s === "number");

    return {
      platform,
      total: filtered.length,
      contacted: filtered.filter(
        (p: Record<string, unknown>) => p.status === "contacted"
      ).length,
      replied: filtered.filter(
        (p: Record<string, unknown>) => p.status === "replied"
      ).length,
      booked: filtered.filter(
        (p: Record<string, unknown>) => p.status === "booked"
      ).length,
      avgScore:
        scores.length > 0
          ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
          : 0,
    };
  });

  return overview;
}

// ─── AI Message Generator ──────────────────────────────────────

export async function generateAiMessage(
  prospectName: string,
  context: string,
  platform: string
) {
  try {
    const message = await aiComplete(
      `Génère un message de prospection personnalisé.

PROSPECT : ${prospectName}
CONTEXTE : ${context}
RÉSEAU : ${platform}

Ton : ${platform === "linkedin" ? "professionnel et structuré, vouvoiement" : platform === "instagram" ? "décontracté et direct, tutoiement, émojis modérés" : "conversationnel, naturel"}

Règles :
- 3 à 5 phrases maximum
- Pas de pitch direct, approche par la curiosité et la valeur
- Termine par une question ouverte
- Adapte le style au réseau ${platform}

Écris uniquement le texte du message, sans guillemets.`,
      {
        system: "Tu es un expert en copywriting et prospection par DM. Tu crées des messages d'approche naturels qui génèrent un taux de réponse élevé.",
        maxTokens: 300,
      }
    );
    return message;
  } catch {
    const templates: Record<string, string> = {
      linkedin: `Bonjour ${prospectName},\n\nJ'ai vu votre profil et ${context}. Je travaille avec des professionnels comme vous pour les aider à développer leur activité.\n\nSeriez-vous ouvert(e) à un échange rapide de 15 min cette semaine ?\n\nBien cordialement`,
      instagram: `Hey ${prospectName} ! 👋\n\nJ'ai vu ton contenu et ${context}. Trop cool ce que tu fais !\n\nJe bosse avec des créateurs dans ta niche et j'ai quelques idées qui pourraient t'intéresser. On en parle en DM ? 🚀`,
    };
    return templates[platform] || `Bonjour ${prospectName},\n\n${context}\n\nÀ bientôt !`;
  }
}

// ─── Profile Analyzer ──────────────────────────────────────

export async function analyzeProfile(profileUrl: string) {
  const isLinkedin = profileUrl.includes("linkedin");
  const isInstagram = profileUrl.includes("instagram");
  const platform = isLinkedin ? "linkedin" : isInstagram ? "instagram" : "autre";

  try {
    const result = await aiJSON<{
      name: string;
      headline: string;
      followers: number;
      engagementRate: number;
      lastActive: string;
      topics: string[];
      score: number;
      recommendation: string;
    }>(
      `Analyse ce profil ${platform} pour la prospection commerciale.

URL : ${profileUrl}

Génère une analyse réaliste du profil avec les informations suivantes :
- name : nom probable basé sur l'URL (extrait du slug)
- headline : titre/bio probable pour ce type de profil
- followers : estimation réaliste du nombre d'abonnés
- engagementRate : taux d'engagement estimé (1.0-10.0)
- lastActive : activité récente estimée
- topics : 3-5 sujets principaux basés sur la niche probable
- score : score de prospection 0-100 (qualité du prospect)
- recommendation : stratégie d'approche recommandée (2 phrases max)

Contexte : profil ${isLinkedin ? "B2B professionnel" : isInstagram ? "créateur/influenceur" : "professionnel"}.
Réponds en JSON.`,
      {
        system: "Tu es un expert en social selling et prospection digitale. Analyse les profils pour identifier les meilleures opportunités commerciales.",
        maxTokens: 500,
      }
    );

    return {
      platform,
      name: result.name || "Profil analysé",
      headline: result.headline || "",
      followers: result.followers || 0,
      engagementRate: result.engagementRate || 0,
      lastActive: result.lastActive || "Inconnu",
      topics: result.topics || [],
      score: Math.min(100, Math.max(0, result.score || 50)),
      recommendation: result.recommendation || "Aucune recommandation disponible.",
    };
  } catch {
    // Fallback sans IA
    return {
      platform,
      name: profileUrl.split("/").filter(Boolean).pop() || "Profil",
      headline: isLinkedin
        ? "Professionnel — Analyse IA indisponible"
        : "Créateur — Analyse IA indisponible",
      followers: 0,
      engagementRate: 0,
      lastActive: "Inconnu",
      topics: [],
      score: 50,
      recommendation: "Analyse IA indisponible. Consultez le profil manuellement pour évaluer le prospect.",
    };
  }
}

// ─── Comment Suggester ─────────────────────────────────────

export async function suggestComments(postUrl: string) {
  try {
    const result = await aiJSON<{
      comments: Array<{ type: string; comment: string }>;
    }>(
      `Génère 3 commentaires intelligents pour un post LinkedIn/Instagram.

URL du post : ${postUrl}

Génère 3 commentaires de types différents :
1. "value" — Apporte de la valeur ajoutée, partage une expérience
2. "question" — Pose une question pertinente pour engager la conversation
3. "story" — Raconte un lien personnel avec le sujet

Réponds en JSON :
{
  "comments": [
    { "type": "value", "comment": "..." },
    { "type": "question", "comment": "..." },
    { "type": "story", "comment": "..." }
  ]
}

Règles :
- Chaque commentaire fait 2-3 phrases
- Ton professionnel mais humain
- Objectif : se faire remarquer positivement par l'auteur du post
- En français`,
      { system: "Tu es un expert en social selling et engagement sur les réseaux sociaux." }
    );
    return result.comments;
  } catch {
    return [
      { type: "value" as const, comment: "Super article ! Le point sur la stratégie de contenu est particulièrement pertinent. J'ai appliqué une approche similaire et les résultats ont été bluffants. Merci du partage 🙌" },
      { type: "question" as const, comment: "Très intéressant ! Quelle a été la plus grosse difficulté que vous avez rencontrée en mettant cela en place ? Je suis curieux d'en savoir plus sur les coulisses." },
      { type: "story" as const, comment: "Ça me parle tellement ! J'accompagne des professionnels sur ce sujet et je retrouve exactement ces tendances. Le marché évolue vite et il faut s'adapter. Bravo pour cette analyse 👏" },
    ];
  }
}

// ─── Story Scraper ─────────────────────────────────────────

export async function scrapeStories(username: string) {
  // Si l'API Instagram est configurée, utiliser le Graph API
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  const businessAccountId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;

  if (accessToken && businessAccountId) {
    try {
      // Récupérer les stories via Instagram Graph API
      const response = await fetch(
        `https://graph.facebook.com/v21.0/${businessAccountId}/stories?fields=id,media_type,timestamp,caption&access_token=${accessToken}`,
        { next: { revalidate: 300 } } // Cache 5 min
      );

      if (response.ok) {
        const data = await response.json();
        return (data.data || []).map((story: Record<string, unknown>) => ({
          id: story.id as string,
          username,
          type: ((story.media_type as string) || "IMAGE").toLowerCase() === "video" ? "video" as const : "image" as const,
          timestamp: (story.timestamp as string) || new Date().toISOString(),
          caption: (story.caption as string) || "",
          hasQuestion: false,
          hasPoll: false,
        }));
      }
    } catch (err) {
      console.error("Instagram API error:", err);
    }
  }

  // Fallback : générer des stories simulées via IA pour l'analyse
  try {
    const result = await aiJSON<{
      stories: Array<{
        type: "image" | "video";
        caption: string;
        hasQuestion: boolean;
        questionText?: string;
        hasPoll: boolean;
        pollQuestion?: string;
      }>;
    }>(
      `Génère 3 stories Instagram réalistes pour le profil @${username}.

Imagine quel type de contenu ce profil posterait en stories.
Pour chaque story, indique :
- type : "image" ou "video"
- caption : texte de la story (avec emojis)
- hasQuestion : true si la story contient un sticker question
- questionText : le texte de la question (si hasQuestion)
- hasPoll : true si la story contient un sondage
- pollQuestion : le texte du sondage (si hasPoll)

Réponds en JSON : { "stories": [...] }`,
      {
        system: "Tu es un expert en analyse de profils Instagram. Génère du contenu réaliste basé sur la niche probable du profil.",
        maxTokens: 500,
      }
    );

    return (result.stories || []).map((story, i) => ({
      id: `story_ai_${i + 1}`,
      username,
      type: story.type || "image",
      timestamp: new Date(Date.now() - (i + 1) * 3 * 60 * 60 * 1000).toISOString(),
      caption: story.caption || "",
      hasQuestion: story.hasQuestion || false,
      questionText: story.questionText,
      hasPoll: story.hasPoll || false,
      pollQuestion: story.pollQuestion,
    }));
  } catch {
    // Fallback statique
    return [
      {
        id: "story_1",
        username,
        type: "image" as const,
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        caption: "Nouveau projet en cours 🔥",
        hasQuestion: false,
        hasPoll: false,
      },
    ];
  }
}

// ─── Prospect Scoring ─────────────────────────────────────────────

/**
 * Calcule un score avance de 0 a 100 pour un prospect.
 * Utilise computeScoreBreakdown (lib/scoring.ts) pour le calcul pur,
 * puis persiste le resultat en base.
 */
export async function calculateProspectScore(prospectId: string) {
  const supabase = await createClient();

  const { data: prospect } = await supabase
    .from("prospects")
    .select("*")
    .eq("id", prospectId)
    .single();

  if (!prospect) throw new Error("Prospect non trouve");

  // Fetch all prospects to determine best-performing platform
  const { data: allProspects } = await supabase
    .from("prospects")
    .select("platform, status, conversation_history");

  const breakdown = computeScoreBreakdown(prospect, allProspects || []);

  // Map tier to temperature for DB compatibility
  const temperatureMap: Record<string, string> = {
    froid: "cold",
    tiede: "warm",
    chaud: "warm",
    brulant: "hot",
  };

  // Upsert to prospect_scores
  const { error } = await supabase.from("prospect_scores").upsert(
    {
      prospect_id: prospectId,
      engagement_score: breakdown.total,
      responsiveness_score: breakdown.recencyScore,
      qualification_score: breakdown.statusScore,
      total_score: breakdown.total,
      temperature: temperatureMap[breakdown.tier] || "cold",
      computed_at: new Date().toISOString(),
    },
    { onConflict: "prospect_id" }
  );

  if (error) throw new Error(error.message);

  // Also update the engagement_score directly on the prospect row
  await supabase
    .from("prospects")
    .update({ engagement_score: breakdown.total })
    .eq("id", prospectId);

  revalidatePath("/prospecting");
  revalidatePath("/prospecting/scoring");
  revalidatePath("/prospecting/hub");

  return breakdown.total;
}

/**
 * Recalcule les scores de tous les prospects en une seule action.
 * Retourne le nombre de prospects mis à jour.
 */
export async function recalculateAllScores() {
  const supabase = await createClient();

  const { data: prospects } = await supabase
    .from("prospects")
    .select("id")
    .order("created_at", { ascending: false });

  if (!prospects || prospects.length === 0) return 0;

  let count = 0;
  for (const p of prospects) {
    try {
      await calculateProspectScore(p.id as string);
      count++;
    } catch {
      // skip individual failures
    }
  }

  revalidatePath("/prospecting");
  revalidatePath("/prospecting/scoring");
  revalidatePath("/prospecting/hub");

  return count;
}

// ─── Smart Follow-Ups ─────────────────────────────────────────────

export async function getSmartFollowUps() {
  const supabase = await createClient();

  const { data: tasks } = await supabase
    .from("follow_up_tasks")
    .select(
      "*, prospect:prospects(id, name, platform, status, profile_url), sequence:follow_up_sequences(id, name)"
    )
    .order("scheduled_at", { ascending: true });

  return (tasks || []).map((t: Record<string, unknown>) => ({
    ...t,
    prospect: Array.isArray(t.prospect) ? t.prospect[0] || null : t.prospect,
    sequence: Array.isArray(t.sequence) ? t.sequence[0] || null : t.sequence,
  }));
}

export async function createFollowUpSequence(data: {
  name: string;
  steps: { day_offset: number; action: string; message_template: string }[];
}) {
  const supabase = await createClient();

  // Steps are stored as JSONB in follow_up_sequences.steps
  const stepsJson = data.steps.map((step, index) => ({
    step_order: index + 1,
    day_offset: step.day_offset,
    action: step.action,
    message_template: step.message_template,
  }));

  const { data: sequence, error } = await supabase
    .from("follow_up_sequences")
    .insert({ name: data.name, steps: stepsJson })
    .select()
    .single();

  if (error || !sequence) throw new Error(error?.message || "Erreur création séquence");

  revalidatePath("/prospecting/follow-ups");
  return sequence;
}

export async function completeFollowUpTask(taskId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("follow_up_tasks")
    .update({
      completed: true,
      completed_at: new Date().toISOString(),
    })
    .eq("id", taskId);

  if (error) throw new Error(error.message);
  revalidatePath("/prospecting/follow-ups");
}

export async function assignFollowUpSequence(
  prospectId: string,
  sequenceId: string
) {
  const supabase = await createClient();

  // Fetch sequence with JSONB steps
  const { data: sequence } = await supabase
    .from("follow_up_sequences")
    .select("*")
    .eq("id", sequenceId)
    .single();

  const steps = (sequence?.steps || []) as Array<{
    step_order: number;
    day_offset: number;
    action: string;
    message_template: string;
  }>;

  if (steps.length === 0)
    throw new Error("Séquence vide ou introuvable");

  // Create tasks for each step
  const now = new Date();
  const tasks = steps.map((step) => ({
    prospect_id: prospectId,
    sequence_id: sequenceId,
    step_index: step.step_order - 1,
    message_content: step.message_template,
    scheduled_at: new Date(
      now.getTime() + step.day_offset * 24 * 60 * 60 * 1000
    ).toISOString(),
    completed: false,
  }));

  const { error } = await supabase.from("follow_up_tasks").insert(tasks);
  if (error) throw new Error(error.message);

  revalidatePath("/prospecting/follow-ups");
}

export async function getFollowUpSequences() {
  const supabase = await createClient();

  const { data: sequences } = await supabase
    .from("follow_up_sequences")
    .select("*")
    .order("created_at", { ascending: false });

  return (sequences || []).map((s: Record<string, unknown>) => ({
    ...s,
    steps: Array.isArray(s.steps) ? s.steps : [],
  }));
}

// ─── Objection Detection (AI + patterns) ───────────────────────────

export async function detectObjections(message: string) {
  try {
    const result = await aiJSON<{
      hasObjection: boolean;
      objections: Array<{ type: string; suggestedResponse: string }>;
      sentiment: string;
      suggestion: string;
    }>(
      `Analyse ce message de prospect et détecte les objections.

MESSAGE DU PROSPECT :
"${message}"

Réponds en JSON :
{
  "hasObjection": true/false,
  "objections": [
    { "type": "prix|temps|intérêt|concurrence|hésitation|confiance", "suggestedResponse": "réponse adaptée" }
  ],
  "sentiment": "positif|neutre|négatif",
  "suggestion": "conseil global pour le setter"
}

Règles :
- Détecte les objections explicites ET implicites
- Les réponses suggérées doivent être empathiques et orientées valeur
- Si pas d'objection, donne un conseil pour continuer la conversation
- En français`,
      { system: "Tu es un coach expert en vente/setting. Tu analyses les messages de prospects pour aider les setters à mieux gérer les objections." }
    );
    return result;
  } catch {
    // Fallback: regex-based detection
    const patterns = [
      { pattern: /trop cher|prix|budget|coût|cher/i, type: "prix", response: "Je comprends votre préoccupation sur le prix. Nos clients constatent un ROI en moyenne de 3x leur investissement dès le premier mois. On peut en discuter ?" },
      { pattern: /pas le temps|occupé|débordé|plus tard|pas maintenant/i, type: "temps", response: "Je comprends, le temps est précieux. Un call de 15 min pourrait vous montrer comment gagner du temps." },
      { pattern: /pas intéressé|ça ne m'intéresse pas|non merci/i, type: "intérêt", response: "Pas de souci ! Par curiosité, quel est votre plus gros défi actuellement ?" },
      { pattern: /déjà.*solution|j'utilise|on a déjà/i, type: "concurrence", response: "Super que vous soyez déjà équipé ! Ça vaut le coup de comparer les approches." },
      { pattern: /réfléchir|j'y pense|je vais voir/i, type: "hésitation", response: "Bien sûr. Je peux vous envoyer une étude de cas pour aider votre réflexion ?" },
    ];
    const detected = patterns.filter(({ pattern }) => pattern.test(message)).map(({ type, response }) => ({ type, suggestedResponse: response }));
    return {
      hasObjection: detected.length > 0,
      objections: detected,
      sentiment: detected.length > 0 ? "négatif" : "neutre",
      suggestion: detected.length > 0 ? `${detected.length} objection(s) détectée(s).` : "Aucune objection détectée. Continuez la conversation !",
    };
  }
}

// ─── Smart Follow-Up Message Generator ──────────────────────────────

export async function generateFollowUpMessage(
  prospectName: string,
  platform: string,
  previousMessages: string[],
  daysSinceLastContact: number
) {
  try {
    const message = await aiComplete(
      `Génère un message de relance pour un prospect qui n'a pas répondu.

PROSPECT : ${prospectName}
RÉSEAU : ${platform}
JOURS SANS RÉPONSE : ${daysSinceLastContact}
MESSAGES PRÉCÉDENTS :
${previousMessages.map((m, i) => `${i + 1}. ${m}`).join("\n")}

Règles :
- Ne pas être insistant ni agressif
- Apporter de la valeur (partage une ressource, un insight, une question)
- Adapter le ton au réseau (${platform === "linkedin" ? "professionnel" : "décontracté"})
- ${daysSinceLastContact > 7 ? "Relance douce, pas de pression" : "Relance naturelle, rebondir sur le dernier message"}
- 2-3 phrases max
- En français

Écris uniquement le texte du message.`,
      {
        system: "Tu es un expert en relance commerciale. Tu crées des messages de follow-up qui réengagent naturellement les prospects sans être pushy.",
        maxTokens: 256,
      }
    );
    return message;
  } catch {
    return daysSinceLastContact > 7
      ? `Bonjour ${prospectName}, je me permets de revenir vers vous. Avez-vous eu le temps de réfléchir à notre échange ?`
      : `${prospectName}, j'ai pensé à vous en voyant [contenu pertinent]. Ça pourrait vous intéresser !`;
  }
}
