"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { aiComplete, aiJSON } from "@/lib/ai/client";
import { computeScoreBreakdown } from "@/lib/scoring";
import { getApiKey } from "@/lib/api-keys";
import { callApifyActor } from "@/lib/apify";

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
      (p: Record<string, unknown>) => p.platform === platform,
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
        (p: Record<string, unknown>) => p.status === "contacted",
      ).length,
      replied: filtered.filter(
        (p: Record<string, unknown>) => p.status === "replied",
      ).length,
      booked: filtered.filter(
        (p: Record<string, unknown>) => p.status === "booked",
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
  platform: string,
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
        system:
          "Tu es un expert en copywriting et prospection par DM. Tu crées des messages d'approche naturels qui génèrent un taux de réponse élevé.",
        maxTokens: 300,
      },
    );
    return message;
  } catch {
    const templates: Record<string, string> = {
      linkedin: `Bonjour ${prospectName},\n\nJ'ai vu votre profil et ${context}. Je travaille avec des professionnels comme vous pour les aider à développer leur activité.\n\nSeriez-vous ouvert(e) à un échange rapide de 15 min cette semaine ?\n\nBien cordialement`,
      instagram: `Hey ${prospectName} ! 👋\n\nJ'ai vu ton contenu et ${context}. Trop cool ce que tu fais !\n\nJe bosse avec des créateurs dans ta niche et j'ai quelques idées qui pourraient t'intéresser. On en parle en DM ? 🚀`,
    };
    return (
      templates[platform] ||
      `Bonjour ${prospectName},\n\n${context}\n\nÀ bientôt !`
    );
  }
}

// ─── Profile Analyzer ──────────────────────────────────────

export async function analyzeProfile(profileUrl: string) {
  const isLinkedin = profileUrl.includes("linkedin");
  const isInstagram = profileUrl.includes("instagram");
  const platform = isLinkedin
    ? "linkedin"
    : isInstagram
      ? "instagram"
      : "autre";

  // --- Enrichissement Apify pour les profils Instagram & LinkedIn ---
  let apifyEnrichment: {
    name?: string;
    biography?: string;
    followers?: number;
    following?: number;
    posts?: number;
    website?: string;
    headline?: string;
    experience?: string;
  } | null = null;

  // ─── LinkedIn : scraping Apify avant analyse IA ──────────────────
  if (isLinkedin) {
    try {
      interface ApifyLinkedInProfile {
        fullName?: string;
        headline?: string;
        summary?: string;
        description?: string;
        followersCount?: number;
        connectionsCount?: number;
        experienceCount?: number;
        experience?: Array<{
          title?: string;
          companyName?: string;
          duration?: string;
        }>;
        skills?: string[];
        location?: string;
        profileUrl?: string;
        [key: string]: unknown;
      }

      const results = await callApifyActor<ApifyLinkedInProfile>(
        "dev_fusion/Linkedin-Profile-Scraper",
        { profileUrls: [profileUrl] },
        120, // Timeout 120s pour LinkedIn
      );

      if (results && results.length > 0) {
        const p = results[0];
        const experienceSummary = p.experience
          ? p.experience
              .slice(0, 3)
              .map((e) => `${e.title || ""} @ ${e.companyName || ""}`)
              .join(", ")
          : undefined;

        apifyEnrichment = {
          name: p.fullName || undefined,
          biography: p.summary || p.description || undefined,
          followers: p.followersCount || p.connectionsCount,
          headline: p.headline || undefined,
          experience: experienceSummary || undefined,
          website: p.profileUrl || undefined,
        };
      }
    } catch (err) {
      console.error(
        "[analyzeProfile] Apify enrichissement LinkedIn echoue:",
        err,
      );
    }
  }

  if (isInstagram) {
    try {
      // Extraire le username depuis l'URL (ex: instagram.com/username)
      const urlParts = profileUrl.replace(/\/$/, "").split("/");
      const username = urlParts[urlParts.length - 1];

      if (username && username !== "instagram.com") {
        interface ApifyInstagramProfile {
          fullName?: string;
          biography?: string;
          followersCount?: number;
          followsCount?: number;
          postsCount?: number;
          externalUrl?: string;
        }

        const results = await callApifyActor<ApifyInstagramProfile>(
          "apify/instagram-profile-scraper",
          { usernames: [username] },
        );

        if (results && results.length > 0) {
          const p = results[0];
          apifyEnrichment = {
            name: p.fullName || undefined,
            biography: p.biography || undefined,
            followers: p.followersCount,
            following: p.followsCount,
            posts: p.postsCount,
            website: p.externalUrl || undefined,
          };
        }
      }
    } catch (err) {
      console.error("Apify enrichissement profil Instagram échoué:", err);
    }
  }

  // Si Apify a retourné des données enrichies, les utiliser pour améliorer l'analyse
  if (apifyEnrichment?.name || apifyEnrichment?.biography) {
    const enrichedName =
      apifyEnrichment.name ||
      profileUrl.split("/").filter(Boolean).pop() ||
      "Profil";
    const enrichedBio = apifyEnrichment.biography || "";
    const enrichedFollowers = apifyEnrichment.followers || 0;

    try {
      const result = await aiJSON<{
        headline: string;
        engagementRate: number;
        lastActive: string;
        topics: string[];
        score: number;
        recommendation: string;
      }>(
        `Analyse ce profil ${platform} enrichi pour la prospection commerciale.

URL : ${profileUrl}
Nom : ${enrichedName}
Bio : ${enrichedBio}
${apifyEnrichment.headline ? `Titre professionnel : ${apifyEnrichment.headline}` : ""}
${apifyEnrichment.experience ? `Experience : ${apifyEnrichment.experience}` : ""}
Followers/Connexions : ${apifyEnrichment.followers || "inconnu"}
Following : ${apifyEnrichment.following || "inconnu"}
Posts : ${apifyEnrichment.posts || "inconnu"}
Site : ${apifyEnrichment.website || "aucun"}

Genere une analyse basee sur ces VRAIES donnees :
- headline : resume du profil en une phrase
- engagementRate : taux d'engagement estime (1.0-10.0)
- lastActive : activite recente estimee
- topics : 3-5 sujets principaux deduits de la bio${apifyEnrichment.headline ? " et du titre" : ""}${apifyEnrichment.experience ? " et de l'experience" : ""}
- score : score de prospection 0-100
- recommendation : strategie d'approche recommandee (2 phrases max)

Reponds en JSON.`,
        {
          system:
            "Tu es un expert en social selling et prospection digitale. Analyse les profils pour identifier les meilleures opportunités commerciales.",
          maxTokens: 500,
        },
      );

      return {
        platform,
        name: enrichedName,
        headline: result.headline || enrichedBio.slice(0, 80),
        followers: enrichedFollowers,
        engagementRate: result.engagementRate || 0,
        lastActive: result.lastActive || "Inconnu",
        topics: result.topics || [],
        score: Math.min(100, Math.max(0, result.score || 50)),
        recommendation:
          result.recommendation || "Aucune recommandation disponible.",
        source: "apify" as const,
      };
    } catch {
      // Si l'IA échoue, retourner quand même les données Apify
      return {
        platform,
        name: enrichedName,
        headline: enrichedBio.slice(0, 80) || "Créateur Instagram",
        followers: enrichedFollowers,
        engagementRate: 0,
        lastActive: "Inconnu",
        topics: [],
        score: 50,
        recommendation:
          "Données enrichies via Apify. Consultez le profil pour affiner l'analyse.",
        source: "apify" as const,
      };
    }
  }

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
        system:
          "Tu es un expert en social selling et prospection digitale. Analyse les profils pour identifier les meilleures opportunités commerciales.",
        maxTokens: 500,
      },
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
      recommendation:
        result.recommendation || "Aucune recommandation disponible.",
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
      recommendation:
        "Analyse IA indisponible. Consultez le profil manuellement pour évaluer le prospect.",
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
      {
        system:
          "Tu es un expert en social selling et engagement sur les réseaux sociaux.",
      },
    );
    return result.comments;
  } catch {
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
}

// ─── Story Scraper ─────────────────────────────────────────

export async function scrapeStories(username: string) {
  // Si l'API Instagram est configurée, utiliser le Graph API
  const accessToken = await getApiKey("INSTAGRAM_ACCESS_TOKEN");
  const businessAccountId = await getApiKey("INSTAGRAM_BUSINESS_ACCOUNT_ID");

  if (accessToken && businessAccountId) {
    try {
      // Récupérer les stories via Instagram Graph API
      const response = await fetch(
        `https://graph.facebook.com/v21.0/${businessAccountId}/stories?fields=id,media_type,timestamp,caption&access_token=${accessToken}`,
        { next: { revalidate: 300 } }, // Cache 5 min
      );

      if (response.ok) {
        const data = await response.json();
        return (data.data || []).map((story: Record<string, unknown>) => ({
          id: story.id as string,
          username,
          type:
            ((story.media_type as string) || "IMAGE").toLowerCase() === "video"
              ? ("video" as const)
              : ("image" as const),
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

  // ─── Tier 2 : Scraping via Apify (données réelles) ──────────────
  try {
    interface ApifyInstagramStory {
      id?: string;
      type?: string;
      mediaType?: number;
      caption?: string;
      timestamp?: string;
      takenAt?: string;
      url?: string;
      videoUrl?: string;
      hashtags?: string[];
      mentions?: string[];
      [key: string]: unknown;
    }

    const apifyStories = await callApifyActor<ApifyInstagramStory>(
      "apify/instagram-scraper",
      {
        directUrls: [`https://www.instagram.com/${username}/`],
        resultsType: "stories",
        resultsLimit: 10,
      },
      120, // Timeout 120s pour le scraping Instagram
    );

    if (apifyStories && apifyStories.length > 0) {
      return apifyStories.map((story, i) => ({
        id: story.id || `story_apify_${i + 1}`,
        username,
        type:
          story.type === "video" || story.mediaType === 2
            ? ("video" as const)
            : ("image" as const),
        timestamp:
          story.timestamp ||
          story.takenAt ||
          new Date(Date.now() - (i + 1) * 3 * 60 * 60 * 1000).toISOString(),
        caption: story.caption || "",
        hasQuestion: false,
        hasPoll: false,
        source: "apify" as const,
      }));
    }
  } catch (apifyErr) {
    console.error(
      "[scrapeStories] Apify Instagram scraper échoué, fallback IA:",
      apifyErr,
    );
  }

  // ─── Tier 3 : Fallback IA (stories simulées — disclaimer) ──────
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
        system:
          "Tu es un expert en analyse de profils Instagram. Génère du contenu réaliste basé sur la niche probable du profil.",
        maxTokens: 500,
      },
    );

    return (result.stories || []).map((story, i) => ({
      id: `story_ai_${i + 1}`,
      username,
      type: story.type || "image",
      timestamp: new Date(
        Date.now() - (i + 1) * 3 * 60 * 60 * 1000,
      ).toISOString(),
      caption: story.caption || "",
      hasQuestion: story.hasQuestion || false,
      questionText: story.questionText,
      hasPoll: story.hasPoll || false,
      pollQuestion: story.pollQuestion,
      source: "ai_simulated" as const,
      disclaimer:
        "Stories simulees par IA — les donnees reelles n'ont pas pu etre recuperees via Instagram API ni Apify.",
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
    { onConflict: "prospect_id" },
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

// ─── Unified Hub Stats (LinkedIn + Instagram + WhatsApp) ─────────

export async function getHubUnifiedStats() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return { linkedin: null, instagram: null, whatsapp: null, totals: null };

  // Prospects stats (LinkedIn + Instagram)
  const { data: prospects } = await supabase
    .from("prospects")
    .select("platform, status")
    .in("platform", ["linkedin", "instagram"]);

  const allProspects = prospects || [];

  function platformStats(platform: string) {
    const filtered = allProspects.filter((p) => p.platform === platform);
    return {
      total: filtered.length,
      contacted: filtered.filter((p) => p.status === "contacted").length,
      replied: filtered.filter((p) => p.status === "replied").length,
      booked: filtered.filter((p) => p.status === "booked").length,
    };
  }

  const linkedin = platformStats("linkedin");
  const instagram = platformStats("instagram");

  // WhatsApp stats
  const { data: connection } = await supabase
    .from("whatsapp_connections")
    .select("id, status")
    .eq("user_id", user.id)
    .single();

  let whatsapp = {
    conversations: 0,
    messagesSent: 0,
    messagesReceived: 0,
    connected: false,
  };

  if (connection) {
    whatsapp.connected = connection.status === "connected";

    const { data: messages } = await supabase
      .from("whatsapp_messages")
      .select("id, direction, prospect_id")
      .eq("connection_id", connection.id);

    const allMessages = messages || [];
    const uniqueProspects = new Set(
      allMessages.map((m) => m.prospect_id).filter(Boolean),
    );

    whatsapp = {
      connected: connection.status === "connected",
      conversations: uniqueProspects.size,
      messagesSent: allMessages.filter((m) => m.direction === "outbound")
        .length,
      messagesReceived: allMessages.filter((m) => m.direction === "inbound")
        .length,
    };
  }

  const totals = {
    totalProspects: linkedin.total + instagram.total + whatsapp.conversations,
    totalContacted:
      linkedin.contacted + instagram.contacted + whatsapp.messagesSent,
    totalReplied:
      linkedin.replied + instagram.replied + whatsapp.messagesReceived,
    totalBooked: linkedin.booked + instagram.booked,
  };

  return { linkedin, instagram, whatsapp, totals };
}

// ─── Smart Follow-Ups ─────────────────────────────────────────────

export async function getSmartFollowUps() {
  const supabase = await createClient();

  const { data: tasks } = await supabase
    .from("follow_up_tasks")
    .select(
      "*, prospect:prospects(id, name, platform, status, profile_url), sequence:follow_up_sequences(id, name)",
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

  if (error || !sequence)
    throw new Error(error?.message || "Erreur création séquence");

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
  sequenceId: string,
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

  if (steps.length === 0) throw new Error("Séquence vide ou introuvable");

  // Create tasks for each step
  const now = new Date();
  const tasks = steps.map((step) => ({
    prospect_id: prospectId,
    sequence_id: sequenceId,
    step_index: step.step_order - 1,
    message_content: step.message_template,
    scheduled_at: new Date(
      now.getTime() + step.day_offset * 24 * 60 * 60 * 1000,
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
      {
        system:
          "Tu es un coach expert en vente/setting. Tu analyses les messages de prospects pour aider les setters à mieux gérer les objections.",
      },
    );
    return result;
  } catch {
    // Fallback: regex-based detection
    const patterns = [
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
          "Je comprends, le temps est précieux. Un call de 15 min pourrait vous montrer comment gagner du temps.",
      },
      {
        pattern: /pas intéressé|ça ne m'intéresse pas|non merci/i,
        type: "intérêt",
        response:
          "Pas de souci ! Par curiosité, quel est votre plus gros défi actuellement ?",
      },
      {
        pattern: /déjà.*solution|j'utilise|on a déjà/i,
        type: "concurrence",
        response:
          "Super que vous soyez déjà équipé ! Ça vaut le coup de comparer les approches.",
      },
      {
        pattern: /réfléchir|j'y pense|je vais voir/i,
        type: "hésitation",
        response:
          "Bien sûr. Je peux vous envoyer une étude de cas pour aider votre réflexion ?",
      },
    ];
    const detected = patterns
      .filter(({ pattern }) => pattern.test(message))
      .map(({ type, response }) => ({ type, suggestedResponse: response }));
    return {
      hasObjection: detected.length > 0,
      objections: detected,
      sentiment: detected.length > 0 ? "négatif" : "neutre",
      suggestion:
        detected.length > 0
          ? `${detected.length} objection(s) détectée(s).`
          : "Aucune objection détectée. Continuez la conversation !",
    };
  }
}

// ─── Analyse de Sentiment (F75) ─────────────────────────────────────

export async function analyzeSentiment(
  messages: Array<{ sender: string; content: string }>,
) {
  const defaultResult = {
    sentiment: "neutral" as const,
    score: 50,
    signals: [] as string[],
  };
  if (!messages.length) return defaultResult;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return defaultResult;

  const lastMessages = messages.slice(-5);
  const conversationText = lastMessages
    .map((m) => `${m.sender}: ${m.content}`)
    .join("\n");

  try {
    const parsed = await aiJSON<{
      sentiment: string;
      score: number;
      signals: string[];
    }>(conversationText, {
      system:
        'Analyse le sentiment de cette conversation de prospection. Retourne du JSON: {"sentiment": "positive"|"hesitant"|"negative"|"neutral"|"hot", "score": 0-100, "signals": ["signal1", "signal2"]}',
      maxTokens: 256,
    });
    return {
      sentiment: parsed.sentiment || "neutral",
      score: typeof parsed.score === "number" ? parsed.score : 50,
      signals: Array.isArray(parsed.signals) ? parsed.signals : [],
    };
  } catch {
    // fallback
  }

  // Simple keyword-based fallback
  const text = conversationText.toLowerCase();
  const positiveWords = [
    "intéressé",
    "oui",
    "super",
    "parfait",
    "ok",
    "quand",
    "comment",
  ];
  const negativeWords = ["non", "pas intéressé", "arrête", "spam", "stop"];
  const hesitantWords = ["peut-être", "je sais pas", "je réfléchis", "pas sûr"];

  const posCount = positiveWords.filter((w) => text.includes(w)).length;
  const negCount = negativeWords.filter((w) => text.includes(w)).length;
  const hesCount = hesitantWords.filter((w) => text.includes(w)).length;

  if (negCount > posCount)
    return {
      sentiment: "negative",
      score: 20,
      signals: ["Mots négatifs détectés"],
    };
  if (hesCount > posCount)
    return {
      sentiment: "hesitant",
      score: 45,
      signals: ["Hésitation détectée"],
    };
  if (posCount >= 2)
    return {
      sentiment: "hot",
      score: 85,
      signals: ["Signaux d'achat détectés"],
    };
  if (posCount > 0)
    return {
      sentiment: "positive",
      score: 65,
      signals: ["Réponses positives"],
    };
  return { sentiment: "neutral", score: 50, signals: [] };
}

// ─── Smart Follow-Up Message Generator ──────────────────────────────

export async function generateFollowUpMessage(
  prospectName: string,
  platform: string,
  previousMessages: string[],
  daysSinceLastContact: number,
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
        system:
          "Tu es un expert en relance commerciale. Tu crées des messages de follow-up qui réengagent naturellement les prospects sans être pushy.",
        maxTokens: 256,
      },
    );
    return message;
  } catch {
    return daysSinceLastContact > 7
      ? `Bonjour ${prospectName}, je me permets de revenir vers vous. Avez-vous eu le temps de réfléchir à notre échange ?`
      : `${prospectName}, j'ai pensé à vous en voyant [contenu pertinent]. Ça pourrait vous intéresser !`;
  }
}

// ─── F72: Analyse Profil Complet (fallback sans post) ───────────────

export async function analyzeProfileComplet(profileData: {
  name: string;
  bio?: string;
  headline?: string;
  experience?: string;
  followers?: number;
  following?: number;
  platform: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const { name, bio, headline, experience, followers, following, platform } =
    profileData;

  // Build analysis prompt from available data
  const dataPoints = [
    bio && `Bio: ${bio}`,
    headline && `Titre: ${headline}`,
    experience && `Expérience: ${experience}`,
    followers && `Followers: ${followers}`,
    following && `Following: ${following}`,
  ]
    .filter(Boolean)
    .join("\n");

  if (!dataPoints) {
    return {
      analysis: {
        accroche: `Salut ${name} ! J'ai vu ton profil ${platform} et j'ai pensé que ça pourrait t'intéresser.`,
        interests: ["Non identifiés — profil privé ou incomplet"],
        approachAngle: "Approche directe avec proposition de valeur claire",
        confidence: "low",
      },
    };
  }

  try {
    const parsed = await aiJSON<{
      accroche: string;
      interests: string[];
      approachAngle: string;
      confidence: string;
    }>(`Profil ${platform} de ${name}:\n${dataPoints}`, {
      system:
        'Tu es un expert en prospection commerciale. Analyse ce profil et génère un message d\'accroche personnalisé. Retourne du JSON: {"accroche": "message", "interests": ["intérêt1"], "approachAngle": "angle", "confidence": "high"|"medium"|"low"}',
      maxTokens: 512,
    });
    return {
      analysis: {
        accroche: parsed.accroche || `Salut ${name} !`,
        interests: Array.isArray(parsed.interests) ? parsed.interests : [],
        approachAngle: parsed.approachAngle || "Approche directe",
        confidence: parsed.confidence || "low",
      },
    };
  } catch {
    // fallback
  }

  // Smart fallback based on available data
  let accroche = `Salut ${name} !`;
  const interests: string[] = [];

  if (bio) {
    const keywords = bio.split(/[\s,.|]+/).filter((w) => w.length > 4);
    if (keywords.length > 0) {
      accroche = `Salut ${name} ! J'ai vu dans ta bio que tu t'intéresses à ${keywords.slice(0, 2).join(" et ")}. `;
      interests.push(...keywords.slice(0, 3));
    }
  }

  if (headline) {
    accroche += `En tant que ${headline}, `;
    interests.push(headline);
  }

  return {
    analysis: {
      accroche:
        accroche +
        "j'ai pensé que notre approche pourrait t'intéresser. Est-ce que tu aurais 15 min pour en discuter ?",
      interests,
      approachAngle: bio ? "Personnalisé via la bio" : "Approche directe",
      confidence: bio ? "medium" : "low",
    },
  };
}

// ─── Feature #32: Campagne Setting IA Full Auto ──────────────────────

export async function runAutoSettingCampaign(profileUrls: string[]) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié", results: [] };

  const results: Array<{
    url: string;
    status: "sent" | "failed" | "queued";
    message?: string;
    error?: string;
  }> = [];

  for (let i = 0; i < profileUrls.length; i++) {
    const url = profileUrls[i];

    try {
      // 1. Analyser le profil
      const analysis = await analyzeProfile(url);

      // 2. Générer un message personnalisé
      const context = `${analysis.headline || "professionnel"} — ${analysis.recommendation || ""}`;
      const message = await generateAiMessage(
        analysis.name || "Prospect",
        context,
        analysis.platform || "linkedin",
      );

      // 3. Sauvegarder comme prospect
      const { data: prospect } = await supabase
        .from("prospects")
        .insert({
          name: analysis.name || url.split("/").pop(),
          platform: analysis.platform || "linkedin",
          profile_url: url,
          status: "contacted",
          engagement_score: analysis.score || 50,
          last_message: message,
          contacted_at: new Date().toISOString(),
          user_id: user.id,
        })
        .select("id")
        .single();

      // 4. Log l'activité
      if (prospect) {
        await supabase.from("prospect_activities").insert({
          prospect_id: prospect.id,
          type: "message_sent",
          content: message,
          platform: analysis.platform || "linkedin",
          created_at: new Date().toISOString(),
        });
      }

      results.push({
        url,
        status: "queued",
        message: message.slice(0, 80) + "...",
      });
    } catch (err) {
      results.push({
        url,
        status: "failed",
        error: err instanceof Error ? err.message : "Erreur inconnue",
      });
    }

    // Rate limit: délai aléatoire entre 2s et 5s entre chaque profil (en mode serveur)
    if (i < profileUrls.length - 1) {
      await new Promise((resolve) =>
        setTimeout(resolve, 2000 + Math.random() * 3000),
      );
    }
  }

  revalidatePath("/prospecting/hub");
  revalidatePath("/prospecting");

  return {
    total: results.length,
    sent: results.filter((r) => r.status === "queued").length,
    failed: results.filter((r) => r.status === "failed").length,
    results,
  };
}
