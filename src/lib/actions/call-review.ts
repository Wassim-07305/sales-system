"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { aiJSON } from "@/lib/ai/client";

// ---------------------------------------------------------------------------
// Demo data — used when the table doesn't exist or returns empty
// ---------------------------------------------------------------------------

function getDemoReviews() {
  return [
    {
      id: "demo-1",
      callId: "call-001",
      userId: "demo-user",
      transcript:
        "Vendeur: Bonjour M. Dupont, merci d'avoir accepté cet appel. Comment allez-vous aujourd'hui ?\nProspect: Bonjour, bien merci. J'ai vu votre solution en ligne et je voulais en savoir plus.\nVendeur: Parfait ! Avant de vous présenter notre offre, j'aimerais comprendre votre situation actuelle. Quels sont vos défis principaux en matière de gestion commerciale ?\nProspect: On perd beaucoup de temps avec notre CRM actuel, les rapports sont compliqués à générer.\nVendeur: Je comprends tout à fait. Combien de temps votre équipe passe-t-elle par semaine sur ces tâches administratives ?\nProspect: Facilement 10 heures par semaine, c'est énorme.\nVendeur: En effet, c'est considérable. Notre solution automatise 80% de ces tâches. Vous pourriez récupérer environ 8 heures par semaine.\nProspect: C'est intéressant, mais le coût ? On a déjà un budget serré.\nVendeur: Je comprends votre préoccupation. Si je vous montre que le ROI est positif dès le premier mois, est-ce que ça changerait votre perspective ?\nProspect: Oui, montrez-moi les chiffres.\nVendeur: Avec 8 heures récupérées par semaine à un coût horaire moyen de 35€, vous économisez 1120€ par mois. Notre abonnement est à 299€. Le gain net est de 821€ mensuel.\nProspect: Les chiffres parlent d'eux-mêmes. Quand peut-on démarrer ?",
      aiAnalysis: {
        scoreBreakdown: {
          ouverture: 9,
          decouverte: 8,
          argumentation: 9,
          closing: 8,
        },
        sentimentTimeline: [
          { time: "0:00", sentiment: "neutre" as const },
          { time: "1:00", sentiment: "positif" as const },
          { time: "2:30", sentiment: "positif" as const },
          { time: "3:30", sentiment: "négatif" as const },
          { time: "4:30", sentiment: "positif" as const },
          { time: "5:30", sentiment: "positif" as const },
        ],
        objections: ["Budget serré", "Coût de la solution"],
        recommendations: [
          "Approfondir la phase de découverte avec des questions plus ouvertes",
          "Ajouter un témoignage client pour renforcer la crédibilité",
          "Proposer un essai gratuit pour réduire la friction",
        ],
        talkRatio: { vendeur: 55, prospect: 45 },
        keyMoments: [
          "Excellente question d'ouverture sur les défis",
          "Bonne quantification du problème (10h/semaine)",
          "ROI chiffré convaincant",
          "Closing naturel après démonstration de valeur",
        ],
      },
      score: 8.5,
      keywords: ["ROI", "automatisation", "CRM", "budget", "gain de temps"],
      sentiment: "positif" as const,
      strengths: [
        "Excellente structuration de l'appel",
        "Bonne gestion de l'objection prix",
        "Argumentation chiffrée et convaincante",
      ],
      improvements: [
        "Phase de découverte un peu courte",
        "Pas de question sur le processus de décision",
      ],
      prospectName: "M. Dupont",
      duration: 12,
      createdAt: "2026-03-07T14:30:00Z",
    },
    {
      id: "demo-2",
      callId: "call-002",
      userId: "demo-user",
      transcript:
        "Vendeur: Bonjour Mme Martin, je suis ravi de vous retrouver. Suite à notre dernier échange, avez-vous eu le temps de réfléchir ?\nProspect: Oui, mais j'ai encore des doutes. Mon associé pense qu'on devrait attendre l'année prochaine.\nVendeur: Je comprends. Qu'est-ce qui motive cette volonté d'attendre exactement ?\nProspect: On a beaucoup de projets en cours, on ne veut pas surcharger l'équipe.\nVendeur: C'est justement pour alléger la charge de votre équipe que notre outil existe. Imaginez : pendant que vos projets avancent, le CRM travaille en arrière-plan.\nProspect: Hmm, mais l'intégration prend combien de temps ?\nVendeur: 48 heures maximum, et notre équipe s'occupe de tout. Zéro effort de votre côté.\nProspect: D'accord, mais je dois en parler à mon associé.\nVendeur: Bien sûr. Et si on planifiait une démo rapide de 15 minutes avec lui ? Comme ça, il peut voir par lui-même.\nProspect: Oui, pourquoi pas. Jeudi prochain ça irait ?",
      aiAnalysis: {
        scoreBreakdown: {
          ouverture: 7,
          decouverte: 7,
          argumentation: 8,
          closing: 7,
        },
        sentimentTimeline: [
          { time: "0:00", sentiment: "neutre" as const },
          { time: "0:30", sentiment: "négatif" as const },
          { time: "1:30", sentiment: "neutre" as const },
          { time: "2:30", sentiment: "neutre" as const },
          { time: "3:30", sentiment: "positif" as const },
          { time: "4:30", sentiment: "positif" as const },
        ],
        objections: [
          "Volonté d'attendre l'année prochaine",
          "Surcharge de l'équipe",
          "Temps d'intégration",
          "Décision partagée avec associé",
        ],
        recommendations: [
          "Créer plus d'urgence (coût de l'inaction)",
          "Demander le rôle exact de l'associé dans la décision",
          "Proposer un engagement conditionnel",
          "Envoyer un récapitulatif écrit avant la démo",
        ],
        talkRatio: { vendeur: 52, prospect: 48 },
        keyMoments: [
          "Bonne relance après objection initiale",
          "Argument de l'allègement de charge pertinent",
          "Intégration en 48h — bon argument",
          "Closing intelligent via proposition de démo à l'associé",
        ],
      },
      score: 7.2,
      keywords: ["intégration", "associé", "démo", "charge", "équipe"],
      sentiment: "mixte" as const,
      strengths: [
        "Bonne gestion des multiples objections",
        "Proposition concrète de next step",
        "Ton professionnel et empathique",
      ],
      improvements: [
        "Manque de création d'urgence",
        "Pas de question sur le budget",
        "Aurait dû qualifier l'associé plus tôt",
      ],
      prospectName: "Mme Martin",
      duration: 8,
      createdAt: "2026-03-06T10:15:00Z",
    },
    {
      id: "demo-3",
      callId: "call-003",
      userId: "demo-user",
      transcript:
        "Vendeur: Salut Pierre, comment vas-tu ?\nProspect: Salut, ça va. Écoute, j'ai pas beaucoup de temps, tu peux me faire un résumé rapide ?\nVendeur: Bien sûr. En gros, on aide les équipes commerciales à doubler leur productivité avec notre plateforme.\nProspect: Ok, mais on utilise déjà Salesforce.\nVendeur: Oui, mais notre solution s'intègre avec Salesforce et vient compléter les fonctionnalités manquantes.\nProspect: Quelles fonctionnalités manquantes ?\nVendeur: Euh... ben, l'automatisation des relances et le scoring prédictif par exemple.\nProspect: On a déjà ça avec nos plugins. Désolé, je ne vois pas l'intérêt. On se rappelle si besoin.\nVendeur: D'accord, bonne journée.",
      aiAnalysis: {
        scoreBreakdown: {
          ouverture: 4,
          decouverte: 3,
          argumentation: 4,
          closing: 2,
        },
        sentimentTimeline: [
          { time: "0:00", sentiment: "neutre" as const },
          { time: "0:30", sentiment: "négatif" as const },
          { time: "1:00", sentiment: "négatif" as const },
          { time: "1:30", sentiment: "négatif" as const },
        ],
        objections: [
          "Utilise déjà Salesforce",
          "A déjà les fonctionnalités avec des plugins",
          "Manque de temps",
        ],
        recommendations: [
          "Poser des questions de découverte AVANT de pitcher",
          "Se renseigner sur le stack du prospect avant l'appel",
          "Préparer des différenciateurs clairs par rapport aux concurrents",
          "Ne pas abandonner au premier refus — reformuler la valeur",
          "Demander un engagement de suivi concret",
        ],
        talkRatio: { vendeur: 40, prospect: 60 },
        keyMoments: [
          "Le prospect a signalé un manque de temps dès le début — non géré",
          "Absence totale de phase de découverte",
          "Abandon rapide après objection Salesforce",
        ],
      },
      score: 3.2,
      keywords: ["Salesforce", "productivité", "automatisation", "plugins"],
      sentiment: "négatif" as const,
      strengths: ["Réponse rapide à la demande de concision"],
      improvements: [
        "Aucune phase de découverte",
        "Pitch générique sans personnalisation",
        "Abandon trop rapide",
        "Pas de proposition de follow-up",
        "Préparation insuffisante sur le prospect",
      ],
      prospectName: "Pierre Leblanc",
      duration: 4,
      createdAt: "2026-03-05T16:45:00Z",
    },
    {
      id: "demo-4",
      callId: "call-004",
      userId: "demo-user",
      transcript:
        "Vendeur: Bonjour Mme Rousseau, merci d'avoir pris ce rendez-vous. J'ai lu votre article sur LinkedIn concernant les défis de digitalisation de votre secteur, très pertinent.\nProspect: Merci ! Oui, c'est un sujet qui me tient à cœur. La digitalisation est un vrai enjeu pour nous.\nVendeur: J'imagine. Pouvez-vous me parler de votre processus commercial actuel ? Comment gérez-vous le suivi de vos opportunités ?\nProspect: On a un tableur Excel partagé... C'est un peu le chaos, surtout quand on a plusieurs commerciaux qui travaillent en même temps.\nVendeur: Le classique ! Et concrètement, quelles sont les conséquences de ce chaos au quotidien ?\nProspect: On perd des affaires, des prospects tombent dans l'oubli, et on n'a aucune visibilité sur le pipeline.\nVendeur: Ça doit être frustrant. Si je vous disais qu'on peut mettre en place un système où chaque prospect est suivi automatiquement, avec des alertes et un pipeline visuel, en combien de temps aimeriez-vous que ce soit opérationnel ?\nProspect: Hier ! (rires) Non, sérieusement, on aurait besoin de quelque chose rapidement.\nVendeur: Parfait. Voici ce que je propose : je vous fais une démo personnalisée avec vos données réelles, et si ça vous convient, on peut être opérationnel en 5 jours. Quand êtes-vous disponible cette semaine ?\nProspect: Mercredi après-midi, ça vous va ?\nVendeur: Parfait, je vous envoie l'invitation de suite. J'aurai besoin d'un export de votre fichier Excel pour préparer la démo. Pouvez-vous me l'envoyer d'ici demain ?\nProspect: Oui, je fais ça aujourd'hui.",
      aiAnalysis: {
        scoreBreakdown: {
          ouverture: 10,
          decouverte: 9,
          argumentation: 9,
          closing: 10,
        },
        sentimentTimeline: [
          { time: "0:00", sentiment: "positif" as const },
          { time: "1:00", sentiment: "positif" as const },
          { time: "2:00", sentiment: "neutre" as const },
          { time: "3:00", sentiment: "négatif" as const },
          { time: "4:00", sentiment: "positif" as const },
          { time: "5:00", sentiment: "positif" as const },
          { time: "6:00", sentiment: "positif" as const },
        ],
        objections: [],
        recommendations: [
          "Mentionner un cas client similaire pour renforcer la confiance",
          "Qualifier le budget avant la démo",
          "Identifier d'autres décisionnaires potentiels",
        ],
        talkRatio: { vendeur: 48, prospect: 52 },
        keyMoments: [
          "Ouverture personnalisée avec référence LinkedIn — excellent",
          "Questions de découverte progressives et pertinentes",
          "Quantification de la douleur (prospects oubliés, pas de visibilité)",
          "Double closing : démo + engagement de données",
        ],
      },
      score: 9.5,
      keywords: [
        "pipeline",
        "digitalisation",
        "Excel",
        "suivi",
        "automatisation",
        "démo",
      ],
      sentiment: "positif" as const,
      strengths: [
        "Préparation excellente (article LinkedIn)",
        "Phase de découverte approfondie",
        "Closing avec double engagement",
        "Ton naturel et empathique",
      ],
      improvements: [
        "Aurait pu qualifier le budget",
        "Pas de mention de cas client similaire",
      ],
      prospectName: "Mme Rousseau",
      duration: 15,
      createdAt: "2026-03-04T09:00:00Z",
    },
    {
      id: "demo-5",
      callId: "call-005",
      userId: "demo-user",
      transcript:
        "Vendeur: Bonjour M. Garcia, suite à votre demande sur notre site, je vous appelle pour discuter de vos besoins.\nProspect: Oui bonjour. J'ai rempli le formulaire mais c'était surtout par curiosité. On n'est pas vraiment en phase d'achat.\nVendeur: Pas de souci, c'est justement le bon moment pour en discuter sans pression. Qu'est-ce qui a attiré votre attention sur notre site ?\nProspect: La partie scoring des leads, ça avait l'air intéressant.\nVendeur: Le scoring est effectivement notre point fort. Actuellement, comment priorisez-vous vos leads ?\nProspect: Au feeling, honnêtement. Le premier arrivé, premier servi.\nVendeur: Et ça fonctionne bien ?\nProspect: Pas vraiment. On gaspille du temps sur des prospects pas qualifiés.\nVendeur: Exactement le problème que notre scoring résout. On analyse 15 critères en temps réel pour prioriser automatiquement. Un de nos clients dans votre secteur a augmenté son taux de conversion de 35% en 2 mois.\nProspect: 35% ? C'est significatif. Mais on n'a que 3 commerciaux, c'est pas trop pour une grosse structure ?\nVendeur: Au contraire, c'est justement les petites équipes qui en bénéficient le plus. Avec 3 commerciaux, chaque heure compte. Voulez-vous voir une démo de 20 minutes ?\nProspect: Oui, envoyez-moi un lien.",
      aiAnalysis: {
        scoreBreakdown: {
          ouverture: 8,
          decouverte: 8,
          argumentation: 9,
          closing: 7,
        },
        sentimentTimeline: [
          { time: "0:00", sentiment: "neutre" as const },
          { time: "0:30", sentiment: "négatif" as const },
          { time: "1:30", sentiment: "neutre" as const },
          { time: "2:30", sentiment: "positif" as const },
          { time: "3:30", sentiment: "positif" as const },
          { time: "4:30", sentiment: "positif" as const },
        ],
        objections: [
          "Pas en phase d'achat",
          "Simple curiosité",
          "Petite équipe (3 commerciaux)",
        ],
        recommendations: [
          "Fixer une date précise pour la démo plutôt que 'envoyez un lien'",
          "Demander qui d'autre participerait à la décision",
          "Créer un sentiment d'urgence avec une offre limitée",
        ],
        talkRatio: { vendeur: 50, prospect: 50 },
        keyMoments: [
          "Excellente gestion du 'pas en phase d'achat'",
          "Pivot vers la curiosité — très bien joué",
          "Preuve sociale avec chiffre concret (35%)",
          "Retournement de l'objection petite équipe",
        ],
      },
      score: 8.0,
      keywords: [
        "scoring",
        "leads",
        "conversion",
        "priorisation",
        "qualification",
      ],
      sentiment: "positif" as const,
      strengths: [
        "Excellente gestion du prospect froid",
        "Utilisation efficace de la preuve sociale",
        "Retournement habile de l'objection taille d'équipe",
      ],
      improvements: [
        "Aurait dû fixer une date de démo précise",
        "Manque de qualification du décisionnaire",
      ],
      prospectName: "M. Garcia",
      duration: 10,
      createdAt: "2026-03-03T11:30:00Z",
    },
  ];
}

function getDemoStats() {
  return {
    totalReviews: 5,
    averageScore: 7.28,
    commonKeywords: [
      { keyword: "automatisation", count: 4 },
      { keyword: "CRM", count: 3 },
      { keyword: "pipeline", count: 3 },
      { keyword: "scoring", count: 3 },
      { keyword: "démo", count: 3 },
      { keyword: "budget", count: 2 },
      { keyword: "ROI", count: 2 },
      { keyword: "conversion", count: 2 },
      { keyword: "leads", count: 2 },
      { keyword: "intégration", count: 2 },
    ],
    improvementTrends: [
      { area: "Phase de découverte", count: 4 },
      { area: "Qualification du décisionnaire", count: 3 },
      { area: "Création d'urgence", count: 3 },
      { area: "Préparation pré-appel", count: 2 },
      { area: "Gestion des objections", count: 2 },
    ],
    scoreOverTime: [
      { date: "03/03", score: 8.0 },
      { date: "04/03", score: 9.5 },
      { date: "05/03", score: 3.2 },
      { date: "06/03", score: 7.2 },
      { date: "07/03", score: 8.5 },
    ],
    scoreDistribution: [
      { range: "1-3", count: 0 },
      { range: "3-5", count: 1 },
      { range: "5-7", count: 0 },
      { range: "7-8", count: 2 },
      { range: "8-10", count: 2 },
    ],
  };
}

// ---------------------------------------------------------------------------
// Server actions
// ---------------------------------------------------------------------------

export async function getCallReviews() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return getDemoReviews();

    const { data, error } = await supabase
      .from("call_reviews")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error || !data || data.length === 0) {
      return getDemoReviews();
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data.map((row: any) => ({
      id: row.id,
      callId: row.call_id,
      userId: row.user_id,
      transcript: row.transcript,
      aiAnalysis: row.ai_analysis,
      score: row.score,
      keywords: row.keywords || [],
      sentiment: row.sentiment || "neutre",
      strengths: row.strengths || [],
      improvements: row.improvements || [],
      prospectName: row.prospect_name || "Inconnu",
      duration: row.duration || 0,
      createdAt: row.created_at,
    }));
  } catch {
    return getDemoReviews();
  }
}

export async function getCallReview(reviewId: string) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("call_reviews")
      .select("*")
      .eq("id", reviewId)
      .single();

    if (error || !data) {
      const demo = getDemoReviews().find((r) => r.id === reviewId);
      return demo || null;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row = data as any;
    return {
      id: row.id,
      callId: row.call_id,
      userId: row.user_id,
      transcript: row.transcript,
      aiAnalysis: row.ai_analysis,
      score: row.score,
      keywords: row.keywords || [],
      sentiment: row.sentiment || "neutre",
      strengths: row.strengths || [],
      improvements: row.improvements || [],
      prospectName: row.prospect_name || "Inconnu",
      duration: row.duration || 0,
      createdAt: row.created_at,
    };
  } catch {
    const demo = getDemoReviews().find((r) => r.id === reviewId);
    return demo || null;
  }
}

export async function getReviewStats() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return getDemoStats();

    const { data, error } = await supabase
      .from("call_reviews")
      .select("score, keywords, improvements, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (error || !data || data.length === 0) {
      return getDemoStats();
    }

    const totalReviews = data.length;
    const averageScore =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data.reduce((sum: number, r: any) => sum + (r.score || 0), 0) /
      totalReviews;

    // Count keywords
    const keywordMap = new Map<string, number>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data.forEach((r: any) => {
      (r.keywords || []).forEach((k: string) => {
        keywordMap.set(k, (keywordMap.get(k) || 0) + 1);
      });
    });
    const commonKeywords = Array.from(keywordMap.entries())
      .map(([keyword, count]) => ({ keyword, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Count improvement areas
    const improvementMap = new Map<string, number>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data.forEach((r: any) => {
      (r.improvements || []).forEach((imp: string) => {
        improvementMap.set(imp, (improvementMap.get(imp) || 0) + 1);
      });
    });
    const improvementTrends = Array.from(improvementMap.entries())
      .map(([area, count]) => ({ area, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const scoreOverTime = data.map((r: any) => ({
      date: new Date(r.created_at).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
      }),
      score: r.score || 0,
    }));

    const scoreDistribution = [
      { range: "1-3", count: 0 },
      { range: "3-5", count: 0 },
      { range: "5-7", count: 0 },
      { range: "7-8", count: 0 },
      { range: "8-10", count: 0 },
    ];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data.forEach((r: any) => {
      const s = r.score || 0;
      if (s < 3) scoreDistribution[0].count++;
      else if (s < 5) scoreDistribution[1].count++;
      else if (s < 7) scoreDistribution[2].count++;
      else if (s < 8) scoreDistribution[3].count++;
      else scoreDistribution[4].count++;
    });

    return {
      totalReviews,
      averageScore: Math.round(averageScore * 10) / 10,
      commonKeywords,
      improvementTrends,
      scoreOverTime,
      scoreDistribution,
    };
  } catch {
    return getDemoStats();
  }
}

export async function analyzeTranscript(transcript: string) {
  try {
    const analysis = await aiJSON<{
      score: number;
      scoreBreakdown: {
        ouverture: number;
        decouverte: number;
        argumentation: number;
        closing: number;
      };
      keywords: string[];
      sentiment: "positif" | "neutre" | "négatif" | "mixte";
      strengths: string[];
      improvements: string[];
      sentimentTimeline: {
        time: string;
        sentiment: "positif" | "neutre" | "négatif";
      }[];
      objections: string[];
      recommendations: string[];
      talkRatio: { vendeur: number; prospect: number };
      keyMoments: string[];
      prospectName: string;
      durationEstimate: number;
    }>(
      `Analyse ce transcript d'appel commercial en français. Évalue la performance du vendeur.\n\nTranscript:\n${transcript}`,
      {
        system: `Tu es un expert en analyse d'appels commerciaux B2B. Analyse le transcript fourni et retourne un JSON avec:
- score: note globale de 1 à 10 (décimal autorisé)
- scoreBreakdown: { ouverture: 1-10, decouverte: 1-10, argumentation: 1-10, closing: 1-10 }
- keywords: liste des mots-clés importants (5-8 max)
- sentiment: sentiment global ("positif", "neutre", "négatif", "mixte")
- strengths: points forts du vendeur (2-4 items)
- improvements: axes d'amélioration (2-5 items)
- sentimentTimeline: évolution du sentiment dans l'appel [{ time: "0:00", sentiment: "neutre" }, ...]
- objections: objections détectées du prospect
- recommendations: recommandations IA concrètes (3-5 items)
- talkRatio: { vendeur: %, prospect: % } — estimation du ratio de parole
- keyMoments: moments clés de l'appel (3-5 items)
- prospectName: nom du prospect détecté dans le transcript
- durationEstimate: durée estimée en minutes`,
        model: "anthropic/claude-3.5-sonnet",
        maxTokens: 2048,
      },
    );

    return analysis;
  } catch (aiError) {
    console.error("[analyzeTranscript] Erreur IA:", aiError);
    throw new Error(
      "L'analyse IA du transcript a échoué. Veuillez réessayer plus tard.",
    );
  }
}

export async function submitTranscript(callId: string, transcript: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  // Analyze with AI
  const analysis = await analyzeTranscript(transcript);

  const reviewData = {
    call_id: callId,
    user_id: user.id,
    transcript,
    ai_analysis: {
      scoreBreakdown: analysis.scoreBreakdown,
      sentimentTimeline: analysis.sentimentTimeline,
      objections: analysis.objections,
      recommendations: analysis.recommendations,
      talkRatio: analysis.talkRatio,
      keyMoments: analysis.keyMoments,
    },
    score: analysis.score,
    keywords: analysis.keywords,
    sentiment: analysis.sentiment,
    strengths: analysis.strengths,
    improvements: analysis.improvements,
    prospect_name: analysis.prospectName,
    duration: analysis.durationEstimate,
  };

  // Try to insert in DB, fall back gracefully
  try {
    const { data } = await supabase
      .from("call_reviews")
      .insert(reviewData)
      .select()
      .single();

    revalidatePath("/roleplay/reviews");

    if (data) {
      return {
        id: data.id,
        ...analysis,
        aiAnalysis: {
          scoreBreakdown: analysis.scoreBreakdown,
          sentimentTimeline: analysis.sentimentTimeline,
          objections: analysis.objections,
          recommendations: analysis.recommendations,
          talkRatio: analysis.talkRatio,
          keyMoments: analysis.keyMoments,
        },
      };
    }
  } catch {
    // Table might not exist — return analysis anyway
  }

  revalidatePath("/roleplay/reviews");

  return {
    id: `temp-${Date.now()}`,
    ...analysis,
    aiAnalysis: {
      scoreBreakdown: analysis.scoreBreakdown,
      sentimentTimeline: analysis.sentimentTimeline,
      objections: analysis.objections,
      recommendations: analysis.recommendations,
      talkRatio: analysis.talkRatio,
      keyMoments: analysis.keyMoments,
    },
  };
}
