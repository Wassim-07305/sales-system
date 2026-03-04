"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { isAiConfigured } from "@/lib/ai/client";
import { complete, completeJSON } from "@/lib/ai/utils";
import {
  DM_GENERATION_SYSTEM_PROMPT,
  OBJECTION_DETECTION_SYSTEM_PROMPT,
  PROFILE_ANALYSIS_SYSTEM_PROMPT,
  COMMENT_SUGGESTION_SYSTEM_PROMPT,
} from "@/lib/ai/prompts";

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

// ─── AI Message Generator ─────────────────────────────────────────

export async function generateAiMessage(
  prospectName: string,
  context: string,
  platform: string
) {
  // Fallback templates si l'IA n'est pas configurée
  const fallback: Record<string, string> = {
    linkedin: `Bonjour ${prospectName},\n\nJ'ai vu votre profil et ${context}. Je travaille avec des professionnels comme vous pour les aider à développer leur activité.\n\nSeriez-vous ouvert(e) à un échange rapide de 15 min cette semaine ?\n\nBien cordialement`,
    instagram: `Hey ${prospectName} ! 👋\n\nJ'ai vu ton contenu et ${context}. Trop cool ce que tu fais !\n\nJe bosse avec des créateurs dans ta niche et j'ai quelques idées qui pourraient t'intéresser. On en parle en DM ? 🚀`,
  };

  if (!isAiConfigured()) {
    return fallback[platform] || `Bonjour ${prospectName},\n\n${context}\n\nÀ bientôt !`;
  }

  try {
    return await complete({
      system: DM_GENERATION_SYSTEM_PROMPT,
      user: `Génère un message de prospection personnalisé.\n\nPLATEFORME : ${platform}\nNOM DU PROSPECT : ${prospectName}\nCONTEXTE : ${context}`,
      model: "HAIKU",
    });
  } catch {
    return fallback[platform] || `Bonjour ${prospectName},\n\n${context}\n\nÀ bientôt !`;
  }
}

// ─── Profile Analyzer ─────────────────────────────────────────────

export async function analyzeProfile(profileUrl: string) {
  const isLinkedin = profileUrl.includes("linkedin");
  const isInstagram = profileUrl.includes("instagram");
  const platform = isLinkedin ? "linkedin" : isInstagram ? "instagram" : "autre";

  const fallback = {
    platform,
    name: "Prospect",
    headline: "Non disponible",
    followers: 0,
    engagementRate: 0,
    lastActive: "Inconnu",
    topics: [] as string[],
    score: 50,
    recommendation: "Analysez le profil manuellement pour plus de détails.",
  };

  if (!isAiConfigured()) return fallback;

  try {
    // Extraire le slug/username depuis l'URL
    const slug = profileUrl.split("/in/")[1]?.replace(/\/$/, "")
      || profileUrl.split(".com/")[1]?.replace(/\/$/, "")
      || profileUrl;

    return await completeJSON<typeof fallback>({
      system: PROFILE_ANALYSIS_SYSTEM_PROMPT,
      user: `Analyse ce profil ${platform} et génère une évaluation structurée.\n\nURL : ${profileUrl}\nSlug/Username : ${slug}\nPlateforme : ${platform}\n\nBase ton analyse sur les indices disponibles dans l'URL et le slug du profil. Estime les métriques de manière réaliste.`,
      model: "SONNET",
      fallback,
    });
  } catch {
    return fallback;
  }
}

// ─── Comment Suggester ────────────────────────────────────────────

export async function suggestComments(postUrl: string) {
  type Comment = { type: "value" | "question" | "story"; comment: string };
  const fallback: Comment[] = [
    { type: "value", comment: "Super article ! Le point sur la stratégie de contenu est particulièrement pertinent. J'ai appliqué une approche similaire et les résultats ont été bluffants. Merci du partage !" },
    { type: "question", comment: "Très intéressant ! Quelle a été la plus grosse difficulté que vous avez rencontrée en mettant cela en place ? Je suis curieux d'en savoir plus sur les coulisses." },
    { type: "story", comment: "Ça me parle tellement ! J'accompagne des professionnels sur ce sujet et je retrouve exactement ces tendances. Le marché évolue vite et il faut s'adapter. Bravo pour cette analyse !" },
  ];

  if (!isAiConfigured()) return fallback;

  try {
    const platform = postUrl.includes("linkedin") ? "LinkedIn" : postUrl.includes("instagram") ? "Instagram" : "réseau social";
    return await completeJSON<Comment[]>({
      system: COMMENT_SUGGESTION_SYSTEM_PROMPT,
      user: `Génère 3 commentaires pertinents pour ce post ${platform} :\n\nURL : ${postUrl}\n\nAdapte le ton à la plateforme ${platform}.`,
      model: "HAIKU",
      fallback,
    });
  } catch {
    return fallback;
  }
}

// ─── Story Scraper (Stub) ─────────────────────────────────────────

export async function scrapeStories(username: string) {
  // Stub: returns fake Instagram stories
  return [
    {
      id: "story_1",
      username,
      type: "image" as const,
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      caption: "Nouveau projet en cours 🔥",
      hasQuestion: false,
      hasPoll: true,
      pollQuestion: "Vous préférez A ou B ?",
    },
    {
      id: "story_2",
      username,
      type: "video" as const,
      timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      caption: "Behind the scenes de notre shooting",
      hasQuestion: true,
      questionText: "Posez-moi vos questions !",
      hasPoll: false,
    },
    {
      id: "story_3",
      username,
      type: "image" as const,
      timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
      caption: "Mon setup du jour ☕",
      hasQuestion: false,
      hasPoll: false,
    },
  ];
}

// ─── Prospect Scoring ─────────────────────────────────────────────

export async function calculateProspectScore(prospectId: string) {
  const supabase = await createClient();

  const { data: prospect } = await supabase
    .from("prospects")
    .select("*")
    .eq("id", prospectId)
    .single();

  if (!prospect) throw new Error("Prospect non trouvé");

  // Scoring based on status + recency
  const statusScores: Record<string, number> = {
    new: 10,
    contacted: 30,
    replied: 60,
    interested: 75,
    booked: 90,
    converted: 100,
    lost: 5,
  };

  let score = statusScores[prospect.status as string] || 10;

  // Recency bonus: more recent = higher score
  const daysSinceUpdate = Math.floor(
    (Date.now() - new Date(prospect.updated_at || prospect.created_at).getTime()) /
      (1000 * 60 * 60 * 24)
  );

  if (daysSinceUpdate <= 1) score += 10;
  else if (daysSinceUpdate <= 3) score += 5;
  else if (daysSinceUpdate <= 7) score += 0;
  else if (daysSinceUpdate <= 14) score -= 5;
  else score -= 15;

  // Clamp between 0 and 100
  score = Math.max(0, Math.min(100, score));

  // Upsert to prospect_scores
  const { error } = await supabase.from("prospect_scores").upsert(
    {
      prospect_id: prospectId,
      engagement_score: score,
      calculated_at: new Date().toISOString(),
    },
    { onConflict: "prospect_id" }
  );

  if (error) throw new Error(error.message);

  revalidatePath("/prospecting/scoring");
  revalidatePath("/prospecting/hub");

  return score;
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

// ─── Objection Detection ──────────────────────────────────────────

export async function detectObjections(message: string) {
  const noObjectionFallback = {
    hasObjection: false as const,
    objections: [] as { type: string; suggestedResponse: string }[],
    suggestion: "Aucune objection détectée. Le prospect semble réceptif, continuez la conversation !",
  };

  if (!isAiConfigured()) {
    // Fallback regex si IA non configurée
    const patterns = [
      { pattern: /trop cher|prix|budget|coût|cher/i, type: "prix", response: "Je comprends votre préoccupation sur le prix. Nos clients constatent un ROI en moyenne de 3x leur investissement dès le premier mois. On peut en discuter ?" },
      { pattern: /pas le temps|occupé|débordé|plus tard|pas maintenant/i, type: "temps", response: "Je comprends, le temps est précieux. C'est justement pour ça que notre solution fait gagner en moyenne 10h par semaine. Un call de 15 min pourrait vous le démontrer." },
      { pattern: /pas intéressé|ça ne m'intéresse pas|non merci/i, type: "intérêt", response: "Pas de souci ! Par curiosité, quel est votre plus gros défi actuellement en termes de prospection ?" },
      { pattern: /déjà.*solution|j'utilise|on a déjà/i, type: "concurrence", response: "Super que vous soyez déjà équipé ! Beaucoup de nos clients utilisaient une solution similaire avant. Ça vaut le coup de comparer ?" },
      { pattern: /réfléchir|j'y pense|je vais voir/i, type: "hésitation", response: "Bien sûr, prenez le temps qu'il vous faut. Je peux vous envoyer une étude de cas d'un client dans votre secteur ?" },
    ];
    const detected = patterns
      .filter(({ pattern }) => pattern.test(message))
      .map(({ type, response }) => ({ type, suggestedResponse: response }));
    if (detected.length === 0) return noObjectionFallback;
    return { hasObjection: true as const, objections: detected, suggestion: `${detected.length} objection(s) détectée(s).` };
  }

  try {
    return await completeJSON<{
      hasObjection: boolean;
      objections: { type: string; suggestedResponse: string }[];
      suggestion: string;
    }>({
      system: OBJECTION_DETECTION_SYSTEM_PROMPT,
      user: `Analyse ce message d'un prospect et détecte les objections :\n\n"${message}"`,
      model: "HAIKU",
      fallback: noObjectionFallback,
    });
  } catch {
    return noObjectionFallback;
  }
}
