"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// ─── Hardcoded roadmap items ─────────────────────────────────────────

const ROADMAP_ITEMS = [
  // ── Planifié ────────────────────────────────────────────────────────
  {
    id: "rm-01",
    title: "Intégration Slack",
    description:
      "Recevez les notifications de deals, bookings et messages directement dans vos canaux Slack.",
    category: "Intégration",
    status: "planned" as const,
    votes: 187,
    createdAt: "2026-02-10",
  },
  {
    id: "rm-02",
    title: "Mode hors-ligne",
    description:
      "Consultez vos contacts, deals et scripts même sans connexion internet. Synchronisation automatique au retour en ligne.",
    category: "Mobile",
    status: "planned" as const,
    votes: 156,
    createdAt: "2026-01-25",
  },
  {
    id: "rm-03",
    title: "App mobile native",
    description:
      "Application iOS et Android native avec notifications push, accès rapide au CRM et appels intégrés.",
    category: "Mobile",
    status: "planned" as const,
    votes: 243,
    createdAt: "2026-01-15",
  },
  {
    id: "rm-04",
    title: "Intégration Calendly",
    description:
      "Synchronisation bidirectionnelle avec Calendly pour la gestion des créneaux de booking.",
    category: "Intégration",
    status: "planned" as const,
    votes: 98,
    createdAt: "2026-02-20",
  },
  {
    id: "rm-05",
    title: "Rapports PDF automatiques",
    description:
      "Génération et envoi automatique de rapports hebdomadaires et mensuels au format PDF par e-mail.",
    category: "Analytics",
    status: "planned" as const,
    votes: 134,
    createdAt: "2026-02-05",
  },
  {
    id: "rm-06",
    title: "API publique REST",
    description:
      "API ouverte pour connecter vos outils externes et automatiser vos workflows commerciaux.",
    category: "Développeur",
    status: "planned" as const,
    votes: 112,
    createdAt: "2026-03-01",
  },
  {
    id: "rm-07",
    title: "Multi-pipelines",
    description:
      "Gérez plusieurs pipelines de vente simultanément pour différents produits ou marchés.",
    category: "CRM",
    status: "planned" as const,
    votes: 167,
    createdAt: "2026-02-15",
  },

  // ── En cours ────────────────────────────────────────────────────────
  {
    id: "rm-08",
    title: "Enrichissement IA des contacts",
    description:
      "Enrichissement automatique des fiches contacts avec données publiques : entreprise, poste, réseaux sociaux, CA estimé.",
    category: "IA",
    status: "in_progress" as const,
    votes: 214,
    createdAt: "2026-01-20",
  },
  {
    id: "rm-09",
    title: "Templates email avancés",
    description:
      "Éditeur drag-and-drop de templates email avec variables dynamiques, images et boutons CTA.",
    category: "Communication",
    status: "in_progress" as const,
    votes: 178,
    createdAt: "2026-02-01",
  },
  {
    id: "rm-10",
    title: "Dashboard personnalisable",
    description:
      "Réorganisez les widgets du dashboard par glisser-déposer et créez vos propres indicateurs.",
    category: "Dashboard",
    status: "in_progress" as const,
    votes: 196,
    createdAt: "2026-01-10",
  },
  {
    id: "rm-11",
    title: "Scoring IA prédictif",
    description:
      "Score de probabilité de closing calculé par IA en fonction du comportement du prospect et de l'historique.",
    category: "IA",
    status: "in_progress" as const,
    votes: 231,
    createdAt: "2026-02-08",
  },
  {
    id: "rm-12",
    title: "Intégration SMS (Twilio)",
    description:
      "Envoyez et recevez des SMS directement depuis la plateforme via Twilio. Séquences SMS automatisées.",
    category: "Communication",
    status: "in_progress" as const,
    votes: 145,
    createdAt: "2026-02-18",
  },
  {
    id: "rm-13",
    title: "Champs personnalisés avancés",
    description:
      "Champs de type formule, lookup et rollup pour des calculs automatiques sur vos fiches contacts et deals.",
    category: "CRM",
    status: "in_progress" as const,
    votes: 119,
    createdAt: "2026-02-25",
  },

  // ── Terminé ─────────────────────────────────────────────────────────
  {
    id: "rm-14",
    title: "Pipeline Kanban drag-and-drop",
    description:
      "Vue Kanban avec glisser-déposer des deals entre les étapes du pipeline. Personnalisation des colonnes.",
    category: "CRM",
    status: "done" as const,
    votes: 312,
    createdAt: "2025-09-15",
  },
  {
    id: "rm-15",
    title: "Système de gamification",
    description:
      "Points, niveaux, streaks, défis individuels et d'équipe pour motiver les commerciaux.",
    category: "Gamification",
    status: "done" as const,
    votes: 287,
    createdAt: "2025-10-01",
  },
  {
    id: "rm-16",
    title: "Centre d'aide intégré",
    description:
      "Documentation complète avec catégories, articles, recherche et FAQ directement dans l'application.",
    category: "Support",
    status: "done" as const,
    votes: 198,
    createdAt: "2025-11-20",
  },
  {
    id: "rm-17",
    title: "Intégration WhatsApp Business",
    description:
      "Connexion WhatsApp Business avec synchronisation des messages, templates et séquences automatiques.",
    category: "Communication",
    status: "done" as const,
    votes: 267,
    createdAt: "2025-08-10",
  },
  {
    id: "rm-18",
    title: "Role-Play avec IA",
    description:
      "Entraînement aux appels de vente avec simulation IA, analyse de performance et debrief automatique.",
    category: "Formation",
    status: "done" as const,
    votes: 234,
    createdAt: "2025-12-05",
  },
  {
    id: "rm-19",
    title: "Éditeur de scripts flowchart",
    description:
      "Éditeur visuel de scripts de vente avec arbre décisionnel, objections et réponses guidées.",
    category: "Outils",
    status: "done" as const,
    votes: 189,
    createdAt: "2025-11-01",
  },
  {
    id: "rm-20",
    title: "Contrats et facturation",
    description:
      "Génération de contrats PDF, signature électronique, facturation récurrente et suivi des paiements.",
    category: "Finance",
    status: "done" as const,
    votes: 256,
    createdAt: "2025-10-15",
  },
  {
    id: "rm-21",
    title: "Communauté et forum",
    description:
      "Espace communautaire avec posts, threads, catégories et modération pour échanger entre membres.",
    category: "Social",
    status: "done" as const,
    votes: 176,
    createdAt: "2025-12-20",
  },
];

// ─── Hardcoded community suggestions ─────────────────────────────────

const COMMUNITY_SUGGESTIONS = [
  {
    id: "sug-01",
    title: "Visioconférence intégrée",
    description:
      "Passer des appels vidéo directement depuis la fiche contact sans quitter la plateforme.",
    category: "Communication",
    votes: 89,
    authorName: "Marie D.",
    createdAt: "2026-02-28",
  },
  {
    id: "sug-02",
    title: "Import depuis HubSpot",
    description:
      "Outil de migration automatique depuis HubSpot avec mapping des champs, deals et historique.",
    category: "Intégration",
    votes: 67,
    authorName: "Thomas L.",
    createdAt: "2026-03-02",
  },
  {
    id: "sug-03",
    title: "Vue timeline des interactions",
    description:
      "Frise chronologique regroupant tous les échanges avec un contact : emails, appels, messages, notes.",
    category: "CRM",
    votes: 124,
    authorName: "Sophie B.",
    createdAt: "2026-02-15",
  },
  {
    id: "sug-04",
    title: "Thème clair",
    description:
      "Option de thème clair en plus du thème sombre actuel pour les utilisateurs qui le préfèrent.",
    category: "Interface",
    votes: 56,
    authorName: "Julien M.",
    createdAt: "2026-03-05",
  },
  {
    id: "sug-05",
    title: "Raccourcis clavier personnalisables",
    description:
      "Configurer ses propres raccourcis clavier pour naviguer plus vite et effectuer des actions rapides.",
    category: "Interface",
    votes: 43,
    authorName: "Camille R.",
    createdAt: "2026-02-22",
  },
];

// ─── Hardcoded release notes ─────────────────────────────────────────

const RELEASE_NOTES = [
  {
    id: "rel-01",
    version: "2.4.0",
    date: "2026-03-01",
    title: "Communauté & Forum",
    changes: [
      {
        type: "feature" as const,
        text: "Espace communautaire avec posts, threads et catégories",
      },
      {
        type: "feature" as const,
        text: "Système de modération avec rôles et permissions",
      },
      {
        type: "improvement" as const,
        text: "Amélioration des notifications push sur mobile",
      },
      {
        type: "fix" as const,
        text: "Correction de l'affichage du leaderboard sur petits écrans",
      },
    ],
  },
  {
    id: "rel-02",
    version: "2.3.0",
    date: "2026-02-01",
    title: "Role-Play IA & Scripts avancés",
    changes: [
      {
        type: "feature" as const,
        text: "Mode Role-Play avec simulation IA et debrief automatique",
      },
      {
        type: "feature" as const,
        text: "Éditeur de scripts en mode flowchart avec @xyflow/react",
      },
      {
        type: "feature" as const,
        text: "Mode présentation pour les scripts de vente",
      },
      {
        type: "improvement" as const,
        text: "Performances du pipeline Kanban améliorées (lazy loading)",
      },
      {
        type: "fix" as const,
        text: "Correction du drag-and-drop sur Safari mobile",
      },
    ],
  },
  {
    id: "rel-03",
    version: "2.2.0",
    date: "2026-01-05",
    title: "Contrats & Facturation",
    changes: [
      {
        type: "feature" as const,
        text: "Génération de contrats PDF avec branding personnalisé",
      },
      {
        type: "feature" as const,
        text: "Facturation récurrente avec suivi des paiements",
      },
      {
        type: "feature" as const,
        text: "Signature électronique intégrée",
      },
      {
        type: "improvement" as const,
        text: "Nouveau design de la page de booking publique",
      },
      {
        type: "fix" as const,
        text: "Correction des fuseaux horaires dans les bookings",
      },
      {
        type: "fix" as const,
        text: "Résolution du bug de duplication des contacts à l'import",
      },
    ],
  },
  {
    id: "rel-04",
    version: "2.1.0",
    date: "2025-12-01",
    title: "WhatsApp Business & Séquences",
    changes: [
      {
        type: "feature" as const,
        text: "Intégration WhatsApp Business API",
      },
      {
        type: "feature" as const,
        text: "Séquences de messages automatiques multi-canaux",
      },
      {
        type: "improvement" as const,
        text: "Refonte du hub de prospection avec nouveaux filtres",
      },
      {
        type: "improvement" as const,
        text: "Optimisation du chargement des pages Analytics",
      },
      {
        type: "fix" as const,
        text: "Correction de la synchronisation des messages en temps réel",
      },
    ],
  },
  {
    id: "rel-05",
    version: "2.0.0",
    date: "2025-10-15",
    title: "Gamification & Academy",
    changes: [
      {
        type: "feature" as const,
        text: "Système de gamification complet : points, niveaux, streaks",
      },
      {
        type: "feature" as const,
        text: "Défis individuels et d'équipe avec récompenses",
      },
      {
        type: "feature" as const,
        text: "Academy LMS avec cours, quiz et certifications",
      },
      {
        type: "feature" as const,
        text: "Leaderboard d'équipe hebdomadaire et mensuel",
      },
      {
        type: "improvement" as const,
        text: "Refonte complète de l'interface utilisateur",
      },
      {
        type: "fix" as const,
        text: "Nombreuses corrections de stabilité et performance",
      },
    ],
  },
  {
    id: "rel-06",
    version: "1.5.0",
    date: "2025-09-01",
    title: "Pipeline Kanban & Analytics",
    changes: [
      {
        type: "feature" as const,
        text: "Pipeline CRM en vue Kanban avec drag-and-drop",
      },
      {
        type: "feature" as const,
        text: "Dashboard Analytics avec funnel, heatmap et projections",
      },
      {
        type: "feature" as const,
        text: "Attribution des sources d'acquisition",
      },
      {
        type: "improvement" as const,
        text: "Amélioration du système de recherche globale",
      },
      {
        type: "fix" as const,
        text: "Correction de l'export CSV pour les caractères spéciaux",
      },
    ],
  },
];

// In-memory vote tracking (per-session, resets on server restart)
const userVotes = new Map<string, Set<string>>();

// ─── Server actions ───────────────────────────────────────────────────

export async function getRoadmapItems() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const votedSet = userVotes.get(user.id) || new Set();

  return ROADMAP_ITEMS.map((item) => ({
    ...item,
    votedByUser: votedSet.has(item.id),
  }));
}

export async function getCommunityS() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const votedSet = userVotes.get(user.id) || new Set();

  return COMMUNITY_SUGGESTIONS.map((s) => ({
    ...s,
    votedByUser: votedSet.has(s.id),
  }));
}

export async function getReleaseNotes() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  return RELEASE_NOTES;
}

export async function voteForFeature(featureId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  // Try Supabase table first, fall back to in-memory
  try {
    const { data: existing } = await supabase
      .from("feature_votes")
      .select("id")
      .eq("user_id", user.id)
      .eq("feature_id", featureId)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("feature_votes")
        .delete()
        .eq("id", existing.id);
    } else {
      await supabase
        .from("feature_votes")
        .insert({ user_id: user.id, feature_id: featureId });
    }
  } catch {
    // Table doesn't exist — use in-memory tracking
    if (!userVotes.has(user.id)) {
      userVotes.set(user.id, new Set());
    }
    const set = userVotes.get(user.id)!;
    if (set.has(featureId)) {
      set.delete(featureId);
    } else {
      set.add(featureId);
    }
  }

  revalidatePath("/roadmap");
}

export async function suggestFeature(data: {
  title: string;
  description: string;
  category: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  if (!data.title.trim() || !data.description.trim()) {
    throw new Error("Le titre et la description sont requis");
  }

  // Try Supabase table, fall back to in-memory
  try {
    await supabase.from("feature_suggestions").insert({
      user_id: user.id,
      title: data.title.trim(),
      description: data.description.trim(),
      category: data.category,
    });
  } catch {
    // Table doesn't exist — silently accept (demo mode)
    COMMUNITY_SUGGESTIONS.push({
      id: `sug-${Date.now()}`,
      title: data.title.trim(),
      description: data.description.trim(),
      category: data.category,
      votes: 1,
      authorName: "Vous",
      createdAt: new Date().toISOString().split("T")[0],
    });
  }

  revalidatePath("/roadmap");
}
