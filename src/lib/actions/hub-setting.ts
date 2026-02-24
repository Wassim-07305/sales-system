"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

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

// ─── AI Message Generator (Stub) ──────────────────────────────────

export async function generateAiMessage(
  prospectName: string,
  context: string,
  platform: string
) {
  // Stub: returns platform-specific DM template
  const templates: Record<string, string> = {
    linkedin: `Bonjour ${prospectName},\n\nJ'ai vu votre profil et ${context}. Je travaille avec des professionnels comme vous pour les aider à développer leur activité.\n\nSeriez-vous ouvert(e) à un échange rapide de 15 min cette semaine ?\n\nBien cordialement`,
    instagram: `Hey ${prospectName} ! 👋\n\nJ'ai vu ton contenu et ${context}. Trop cool ce que tu fais !\n\nJe bosse avec des créateurs dans ta niche et j'ai quelques idées qui pourraient t'intéresser. On en parle en DM ? 🚀`,
  };

  return (
    templates[platform] ||
    `Bonjour ${prospectName},\n\n${context}\n\nÀ bientôt !`
  );
}

// ─── Profile Analyzer (Stub) ──────────────────────────────────────

export async function analyzeProfile(profileUrl: string) {
  // Stub: returns fake profile analysis
  const isLinkedin = profileUrl.includes("linkedin");
  const isInstagram = profileUrl.includes("instagram");

  return {
    platform: isLinkedin ? "linkedin" : isInstagram ? "instagram" : "autre",
    name: "Jean-Pierre Dupont",
    headline: isLinkedin
      ? "CEO @ StartupTech | Passionné par l'IA et le Growth"
      : "Créateur de contenu | 12K abonnés",
    followers: isLinkedin ? 2450 : 12300,
    engagementRate: isLinkedin ? 3.2 : 4.8,
    lastActive: "Il y a 2 jours",
    topics: isLinkedin
      ? ["IA", "SaaS", "Leadership", "Growth Hacking"]
      : ["Lifestyle", "Business", "Motivation"],
    score: isLinkedin ? 78 : 65,
    recommendation: isLinkedin
      ? "Profil très actif avec un bon réseau B2B. Approche recommandée : commentaire sur un post récent avant DM."
      : "Bon taux d'engagement. Approche recommandée : réagir à 3 stories avant DM.",
  };
}

// ─── Comment Suggester (Stub) ─────────────────────────────────────

export async function suggestComments(postUrl: string) {
  // Stub: returns 3 French comment suggestions
  void postUrl;
  return [
    {
      type: "value" as const,
      comment:
        "Super article ! Le point sur la stratégie de contenu est particulièrement pertinent. J'ai appliqué une approche similaire et les résultats ont été bluffants. Merci du partage 🙌",
    },
    {
      type: "question" as const,
      comment:
        "Très intéressant ! Quelle a été la plus grosse difficulté que vous avez rencontrée en mettant cela en place ? Je suis curieux d'en savoir plus sur les coulisses.",
    },
    {
      type: "story" as const,
      comment:
        "Ça me parle tellement ! J'accompagne des professionnels sur ce sujet et je retrouve exactement ces tendances. Le marché évolue vite et il faut s'adapter. Bravo pour cette analyse 👏",
    },
  ];
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

  const { data: sequence, error: seqError } = await supabase
    .from("follow_up_sequences")
    .insert({ name: data.name })
    .select()
    .single();

  if (seqError || !sequence) throw new Error(seqError?.message || "Erreur création séquence");

  // Create steps
  const steps = data.steps.map((step, index) => ({
    sequence_id: sequence.id,
    step_order: index + 1,
    day_offset: step.day_offset,
    action: step.action,
    message_template: step.message_template,
  }));

  const { error: stepsError } = await supabase
    .from("follow_up_sequence_steps")
    .insert(steps);

  if (stepsError) throw new Error(stepsError.message);

  revalidatePath("/prospecting/follow-ups");
  return sequence;
}

export async function completeFollowUpTask(taskId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("follow_up_tasks")
    .update({
      status: "completed",
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

  // Fetch sequence steps
  const { data: steps } = await supabase
    .from("follow_up_sequence_steps")
    .select("*")
    .eq("sequence_id", sequenceId)
    .order("step_order");

  if (!steps || steps.length === 0)
    throw new Error("Séquence vide ou introuvable");

  // Create tasks for each step
  const now = new Date();
  const tasks = steps.map(
    (step: Record<string, unknown>) => ({
      prospect_id: prospectId,
      sequence_id: sequenceId,
      step_order: step.step_order,
      action: step.action,
      message_template: step.message_template,
      scheduled_at: new Date(
        now.getTime() +
          (step.day_offset as number) * 24 * 60 * 60 * 1000
      ).toISOString(),
      status: "pending",
    })
  );

  const { error } = await supabase.from("follow_up_tasks").insert(tasks);
  if (error) throw new Error(error.message);

  revalidatePath("/prospecting/follow-ups");
}

export async function getFollowUpSequences() {
  const supabase = await createClient();

  const { data: sequences } = await supabase
    .from("follow_up_sequences")
    .select("*, steps:follow_up_sequence_steps(*)")
    .order("created_at", { ascending: false });

  return (sequences || []).map((s: Record<string, unknown>) => ({
    ...s,
    steps: Array.isArray(s.steps) ? s.steps : [],
  }));
}

// ─── Objection Detection (Stub) ───────────────────────────────────

export async function detectObjections(message: string) {
  const patterns: {
    pattern: RegExp;
    type: string;
    response: string;
  }[] = [
    {
      pattern: /trop cher|prix|budget|coût|cher/i,
      type: "prix",
      response:
        "Je comprends votre préoccupation sur le prix. Nos clients constatent un ROI en moyenne de 3x leur investissement dès le premier mois. On peut en discuter ?",
    },
    {
      pattern: /pas le temps|occupé|débordé|plus tard|pas maintenant/i,
      type: "temps",
      response:
        "Je comprends, le temps est précieux. C'est justement pour ça que notre solution fait gagner en moyenne 10h par semaine. Un call de 15 min pourrait vous le démontrer.",
    },
    {
      pattern: /pas intéressé|ça ne m'intéresse pas|non merci/i,
      type: "intérêt",
      response:
        "Pas de souci ! Par curiosité, quel est votre plus gros défi actuellement en termes de prospection ? Je pourrai peut-être vous partager une ressource utile.",
    },
    {
      pattern: /déjà.*solution|j'utilise|on a déjà/i,
      type: "concurrence",
      response:
        "Super que vous soyez déjà équipé ! Beaucoup de nos clients utilisaient une solution similaire avant. Ce qui les a fait switcher, c'est [avantage clé]. Ça vaut le coup de comparer ?",
    },
    {
      pattern: /réfléchir|j'y pense|je vais voir/i,
      type: "hésitation",
      response:
        "Bien sûr, prenez le temps qu'il vous faut. Pour vous aider dans votre réflexion, je peux vous envoyer une étude de cas d'un client dans votre secteur ?",
    },
  ];

  const detected = patterns
    .filter(({ pattern }) => pattern.test(message))
    .map(({ type, response }) => ({ type, suggestedResponse: response }));

  if (detected.length === 0) {
    return {
      hasObjection: false,
      objections: [],
      suggestion:
        "Aucune objection détectée. Le prospect semble réceptif, continuez la conversation !",
    };
  }

  return {
    hasObjection: true,
    objections: detected,
    suggestion: `${detected.length} objection(s) détectée(s). Utilisez les réponses suggérées pour avancer.`,
  };
}
