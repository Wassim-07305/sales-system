"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// ─── Types ────────────────────────────────────────────────────────────
export interface HelpCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string; // lucide icon name
  articleCount: number;
}

export interface HelpArticle {
  id: string;
  title: string;
  slug: string;
  categoryId: string;
  categoryName: string;
  excerpt: string;
  content: string;
  popular: boolean;
  updatedAt: string;
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

// ─── Hardcoded data ───────────────────────────────────────────────────

const CATEGORIES: HelpCategory[] = [
  {
    id: "cat-demarrage",
    name: "Démarrage",
    slug: "demarrage",
    description: "Premiers pas avec la plateforme",
    icon: "Rocket",
    articleCount: 3,
  },
  {
    id: "cat-crm",
    name: "CRM & Pipeline",
    slug: "crm-pipeline",
    description: "Gérer vos deals et votre pipeline commercial",
    icon: "Kanban",
    articleCount: 3,
  },
  {
    id: "cat-prospection",
    name: "Prospection",
    slug: "prospection",
    description: "Trouver et qualifier vos prospects",
    icon: "Target",
    articleCount: 3,
  },
  {
    id: "cat-contrats",
    name: "Contrats",
    slug: "contrats",
    description: "Créer et gérer vos contrats clients",
    icon: "FileText",
    articleCount: 3,
  },
  {
    id: "cat-analytics",
    name: "Analytics",
    slug: "analytics",
    description: "Analyser vos performances commerciales",
    icon: "BarChart3",
    articleCount: 3,
  },
  {
    id: "cat-gamification",
    name: "Gamification",
    slug: "gamification",
    description: "Points, niveaux et défis",
    icon: "Trophy",
    articleCount: 3,
  },
  {
    id: "cat-communication",
    name: "Communication",
    slug: "communication",
    description: "Chat, WhatsApp et messagerie",
    icon: "MessageSquare",
    articleCount: 3,
  },
  {
    id: "cat-parametres",
    name: "Paramètres",
    slug: "parametres",
    description: "Configuration et personnalisation",
    icon: "Settings",
    articleCount: 3,
  },
];

const ARTICLES: HelpArticle[] = [
  // ── Démarrage ───────────────────────────────────────────────────────
  {
    id: "art-01",
    title: "Créer votre compte et compléter l'onboarding",
    slug: "creer-compte-onboarding",
    categoryId: "cat-demarrage",
    categoryName: "Démarrage",
    excerpt: "Apprenez à créer votre compte et à configurer votre profil en quelques minutes.",
    content: `<h2>Créer votre compte</h2>
<p>Pour commencer à utiliser la plateforme, rendez-vous sur la page d'inscription et renseignez votre adresse e-mail professionnelle ainsi qu'un mot de passe sécurisé. Un e-mail de confirmation vous sera envoyé pour valider votre compte.</p>
<p>Une fois votre e-mail confirmé, vous serez redirigé vers le processus d'onboarding. Ce parcours guidé vous permet de configurer votre profil, de sélectionner votre rôle (setter, closer, manager) et de personnaliser vos préférences de notification.</p>
<h2>Compléter votre profil</h2>
<p>Renseignez votre nom complet, ajoutez une photo de profil et indiquez vos objectifs mensuels. Ces informations seront utilisées dans le dashboard et le leaderboard de l'équipe. Vous pouvez modifier ces paramètres à tout moment depuis la section Profil.</p>`,
    popular: true,
    updatedAt: "2026-02-15",
  },
  {
    id: "art-02",
    title: "Comprendre le dashboard principal",
    slug: "comprendre-dashboard",
    categoryId: "cat-demarrage",
    categoryName: "Démarrage",
    excerpt: "Tour d'horizon du tableau de bord et de ses widgets principaux.",
    content: `<h2>Vue d'ensemble</h2>
<p>Le dashboard est la première page que vous voyez après connexion. Il affiche un résumé de vos indicateurs clés : chiffre d'affaires mensuel, nombre de deals en cours, taux de closing et prochains rendez-vous. Chaque widget est cliquable et vous redirige vers la section détaillée correspondante.</p>
<p>Les managers et admins disposent d'un dashboard étendu avec les performances de toute l'équipe, les alertes sur les deals inactifs depuis plus de 7 jours et un récapitulatif des bookings de la semaine.</p>
<h2>Personnalisation</h2>
<p>Vous pouvez réorganiser les widgets selon vos préférences et masquer ceux qui ne sont pas pertinents pour votre activité quotidienne. Les données se rafraîchissent automatiquement toutes les 5 minutes.</p>`,
    popular: true,
    updatedAt: "2026-02-20",
  },
  {
    id: "art-03",
    title: "Naviguer dans l'application",
    slug: "naviguer-application",
    categoryId: "cat-demarrage",
    categoryName: "Démarrage",
    excerpt: "Découvrez la sidebar, la navigation mobile et les raccourcis clavier.",
    content: `<h2>La sidebar de navigation</h2>
<p>La sidebar gauche est votre point d'accès principal à toutes les fonctionnalités. Elle est organisée en sections : Ventes, Communication, Prospection, Formation et Gestion. Vous pouvez la réduire en cliquant sur le bouton de collapse pour gagner de l'espace écran.</p>
<p>Sur mobile, la navigation est remplacée par une barre inférieure avec les 5 sections les plus utilisées. Les autres pages restent accessibles via le menu hamburger.</p>
<h2>Recherche rapide</h2>
<p>Utilisez la barre de recherche en haut de page pour trouver rapidement un contact, un deal ou une fonctionnalité. La recherche est contextuelle et propose des résultats en temps réel au fur et à mesure de votre saisie.</p>`,
    popular: false,
    updatedAt: "2026-01-10",
  },

  // ── CRM & Pipeline ─────────────────────────────────────────────────
  {
    id: "art-04",
    title: "Gérer votre pipeline avec le Kanban",
    slug: "gerer-pipeline-kanban",
    categoryId: "cat-crm",
    categoryName: "CRM & Pipeline",
    excerpt: "Utilisez le tableau Kanban pour suivre vos deals à travers les étapes du pipeline.",
    content: `<h2>Le tableau Kanban</h2>
<p>Le CRM utilise une vue Kanban avec 6 étapes par défaut : Prospect, Contacté, Appel Découverte, Proposition, Closing et Client Signé. Chaque deal est représenté par une carte que vous pouvez déplacer d'une colonne à l'autre par simple glisser-déposer.</p>
<p>Cliquez sur une carte pour accéder au détail du deal : historique des interactions, notes, fichiers joints et informations du contact associé. Vous pouvez également modifier la valeur du deal et ajouter des tags pour faciliter le filtrage.</p>
<h2>Personnaliser les étapes</h2>
<p>Les administrateurs peuvent ajouter, renommer ou réorganiser les étapes du pipeline depuis les paramètres. Chaque étape possède une couleur personnalisable pour faciliter la lecture visuelle du tableau.</p>`,
    popular: true,
    updatedAt: "2026-03-01",
  },
  {
    id: "art-05",
    title: "Créer et qualifier un deal",
    slug: "creer-qualifier-deal",
    categoryId: "cat-crm",
    categoryName: "CRM & Pipeline",
    excerpt: "Ajoutez un nouveau deal et renseignez les informations clés pour le qualifier.",
    content: `<h2>Création d'un deal</h2>
<p>Pour créer un deal, cliquez sur le bouton « Nouveau deal » en haut de la page CRM. Renseignez le titre, la valeur estimée, l'étape initiale et associez un contact existant ou créez-en un nouveau. Les champs obligatoires sont le titre et le contact.</p>
<p>Vous pouvez également attribuer le deal à un setter ou un closer spécifique. Si aucun assignement n'est fait, le deal apparaîtra dans la file d'attente commune de l'équipe.</p>
<h2>Qualification</h2>
<p>Utilisez les notes et les tags pour qualifier vos deals. Un système de scoring automatique évalue la probabilité de closing en fonction de l'avancement dans le pipeline, du temps passé à chaque étape et des interactions enregistrées.</p>`,
    popular: false,
    updatedAt: "2026-02-28",
  },
  {
    id: "art-06",
    title: "Importer des contacts dans le CRM",
    slug: "importer-contacts-crm",
    categoryId: "cat-crm",
    categoryName: "CRM & Pipeline",
    excerpt: "Importez vos contacts en masse via un fichier CSV ou Excel.",
    content: `<h2>Importer via CSV</h2>
<p>Rendez-vous dans la section Contacts puis cliquez sur « Import en masse ». Sélectionnez votre fichier CSV ou Excel. La plateforme détectera automatiquement les colonnes et vous proposera un mapping vers les champs du système : nom, e-mail, téléphone, entreprise, etc.</p>
<p>Avant de lancer l'import, vous pouvez prévisualiser les données et corriger les éventuelles erreurs de mapping. Le système détecte automatiquement les doublons basés sur l'adresse e-mail et vous propose de les fusionner ou de les ignorer.</p>
<h2>Après l'import</h2>
<p>Une fois l'import terminé, un rapport récapitulatif indique le nombre de contacts créés, mis à jour et ignorés. Les contacts importés sont immédiatement disponibles dans le CRM et peuvent être associés à des deals.</p>`,
    popular: false,
    updatedAt: "2026-02-10",
  },

  // ── Prospection ─────────────────────────────────────────────────────
  {
    id: "art-07",
    title: "Utiliser le hub de prospection",
    slug: "hub-prospection",
    categoryId: "cat-prospection",
    categoryName: "Prospection",
    excerpt: "Centralisez toutes vos actions de prospection depuis le hub dédié.",
    content: `<h2>Le hub de prospection</h2>
<p>Le hub est votre centre de commande pour la prospection. Il regroupe vos quotas quotidiens de DMs, le suivi des réponses, les bookings générés et votre taux de conversion. Fixez-vous des objectifs journaliers et suivez votre progression en temps réel grâce aux barres de progression.</p>
<p>Le hub affiche également vos prospects chauds — ceux qui ont répondu récemment ou montré un intérêt — pour que vous puissiez les relancer en priorité. Chaque prospect est tagué avec son statut : nouveau, contacté, chaud, qualifié ou converti.</p>
<h2>Intégration LinkedIn et Instagram</h2>
<p>Connectez vos comptes LinkedIn et Instagram pour enrichir automatiquement vos fiches prospects avec les informations publiques disponibles. Les messages envoyés depuis ces plateformes sont synchronisés dans le hub.</p>`,
    popular: true,
    updatedAt: "2026-03-05",
  },
  {
    id: "art-08",
    title: "Configurer le scoring des prospects",
    slug: "scoring-prospects",
    categoryId: "cat-prospection",
    categoryName: "Prospection",
    excerpt: "Définissez vos critères de scoring pour prioriser vos prospects.",
    content: `<h2>Le scoring automatique</h2>
<p>Le scoring attribue un score de 0 à 100 à chaque prospect en fonction de critères configurables : réactivité aux messages, engagement sur les réseaux sociaux, taille de l'entreprise, secteur d'activité et correspondance avec votre client idéal.</p>
<p>Les prospects avec un score élevé (> 70) sont automatiquement marqués comme « chauds » et remontés en priorité dans votre file de relance. Vous recevez une notification lorsqu'un prospect atteint ce seuil.</p>
<h2>Personnaliser les critères</h2>
<p>Ajustez le poids de chaque critère depuis la page de configuration du scoring. Vous pouvez également créer des règles personnalisées basées sur des champs spécifiques de vos fiches prospects.</p>`,
    popular: false,
    updatedAt: "2026-02-22",
  },
  {
    id: "art-09",
    title: "Planifier des séquences de relance",
    slug: "sequences-relance",
    categoryId: "cat-prospection",
    categoryName: "Prospection",
    excerpt: "Automatisez vos relances avec des séquences multi-canaux.",
    content: `<h2>Créer une séquence</h2>
<p>Les séquences vous permettent de planifier des relances automatiques par e-mail, SMS ou message direct. Définissez le nombre d'étapes, les délais entre chaque relance et le contenu de chaque message. Les séquences s'arrêtent automatiquement lorsque le prospect répond.</p>
<p>Utilisez les templates disponibles comme point de départ et personnalisez-les avec des variables dynamiques : prénom, nom de l'entreprise, dernière interaction, etc.</p>
<h2>Suivi des performances</h2>
<p>Chaque séquence dispose de ses propres statistiques : taux d'ouverture, taux de réponse et taux de conversion en booking. Comparez vos séquences entre elles pour identifier les messages les plus performants.</p>`,
    popular: false,
    updatedAt: "2026-01-30",
  },

  // ── Contrats ────────────────────────────────────────────────────────
  {
    id: "art-10",
    title: "Créer un contrat client",
    slug: "creer-contrat",
    categoryId: "cat-contrats",
    categoryName: "Contrats",
    excerpt: "Générez un contrat professionnel en quelques clics.",
    content: `<h2>Création du contrat</h2>
<p>Depuis la section Contrats, cliquez sur « Nouveau contrat ». Sélectionnez le deal et le contact associés, puis choisissez un modèle de contrat. Renseignez les conditions : montant, durée, modalités de paiement et clauses spécifiques.</p>
<p>Le contrat est généré au format PDF avec votre branding (logo, couleurs, mentions légales). Vous pouvez le prévisualiser et le modifier avant envoi au client.</p>
<h2>Signature et suivi</h2>
<p>Envoyez le contrat par e-mail directement depuis la plateforme. Le client reçoit un lien sécurisé pour consulter et signer électroniquement le document. Vous êtes notifié en temps réel de chaque action : ouverture, lecture, signature.</p>`,
    popular: false,
    updatedAt: "2026-02-18",
  },
  {
    id: "art-11",
    title: "Gérer les factures et paiements",
    slug: "factures-paiements",
    categoryId: "cat-contrats",
    categoryName: "Contrats",
    excerpt: "Suivez vos factures et encaissements depuis la section Contrats.",
    content: `<h2>Facturation</h2>
<p>Une fois un contrat signé, vous pouvez générer des factures associées. La facturation peut être ponctuelle ou récurrente (mensuelle, trimestrielle, annuelle). Chaque facture est numérotée automatiquement selon votre séquence configurée dans les paramètres.</p>
<p>Les factures sont envoyées par e-mail au client avec un lien de paiement en ligne. Les paiements acceptés incluent la carte bancaire, le virement et le prélèvement SEPA.</p>
<h2>Suivi des paiements</h2>
<p>Le tableau de suivi affiche l'état de chaque facture : en attente, payée, en retard ou annulée. Des relances automatiques peuvent être configurées pour les factures en retard.</p>`,
    popular: false,
    updatedAt: "2026-02-25",
  },
  {
    id: "art-12",
    title: "Modèles de contrats personnalisés",
    slug: "modeles-contrats",
    categoryId: "cat-contrats",
    categoryName: "Contrats",
    excerpt: "Créez des modèles réutilisables pour accélérer la rédaction de vos contrats.",
    content: `<h2>Créer un modèle</h2>
<p>Depuis les paramètres de la section Contrats, accédez à la gestion des modèles. Créez un nouveau modèle en définissant la structure, les clauses par défaut et les variables dynamiques (nom du client, montant, dates, etc.).</p>
<p>Les modèles supportent le rich text avec mise en forme, tableaux et insertion d'images. Vous pouvez dupliquer un modèle existant pour créer des variantes adaptées à différents types de prestations.</p>
<h2>Utilisation</h2>
<p>Lors de la création d'un contrat, sélectionnez simplement le modèle souhaité. Les variables sont automatiquement remplies avec les données du deal et du contact. Vous pouvez toujours ajuster le contenu avant la génération finale du PDF.</p>`,
    popular: false,
    updatedAt: "2026-01-20",
  },

  // ── Analytics ───────────────────────────────────────────────────────
  {
    id: "art-13",
    title: "Lire le funnel de conversion",
    slug: "funnel-conversion",
    categoryId: "cat-analytics",
    categoryName: "Analytics",
    excerpt: "Comprenez votre taux de conversion à chaque étape du pipeline.",
    content: `<h2>Le funnel de conversion</h2>
<p>Le funnel affiche le nombre de deals à chaque étape du pipeline et le taux de passage entre les étapes. Cette visualisation vous permet d'identifier rapidement les goulots d'étranglement : si beaucoup de deals passent de « Contacté » à « Appel Découverte » mais peu convertissent en « Proposition », vous savez où concentrer vos efforts.</p>
<p>Filtrez le funnel par période (semaine, mois, trimestre), par setter/closer ou par source d'acquisition pour affiner votre analyse.</p>
<h2>Recommandations</h2>
<p>La plateforme génère des recommandations automatiques basées sur votre funnel : suggestions d'amélioration des scripts, identification des étapes les plus longues et comparaison avec les moyennes de l'équipe.</p>`,
    popular: false,
    updatedAt: "2026-03-02",
  },
  {
    id: "art-14",
    title: "Projections et objectifs",
    slug: "projections-objectifs",
    categoryId: "cat-analytics",
    categoryName: "Analytics",
    excerpt: "Utilisez les projections pour anticiper votre chiffre d'affaires.",
    content: `<h2>Projections automatiques</h2>
<p>La page Projections calcule votre chiffre d'affaires prévisionnel en se basant sur les deals en cours dans le pipeline, leur probabilité de closing (déduite de l'étape) et les tendances historiques. Le graphique affiche une courbe de projection sur les 3 prochains mois.</p>
<p>Comparez vos projections avec vos objectifs mensuels pour savoir si vous êtes en avance ou en retard sur votre target. Le système alerte automatiquement si la trajectoire actuelle ne permettra pas d'atteindre l'objectif.</p>
<h2>Objectifs d'équipe</h2>
<p>Les managers peuvent définir des objectifs individuels et collectifs. Le suivi est visible sur le dashboard de chaque membre et dans le leaderboard d'équipe.</p>`,
    popular: false,
    updatedAt: "2026-02-12",
  },
  {
    id: "art-15",
    title: "Analyser les sources d'acquisition",
    slug: "sources-acquisition",
    categoryId: "cat-analytics",
    categoryName: "Analytics",
    excerpt: "Identifiez vos canaux d'acquisition les plus performants.",
    content: `<h2>Attribution des sources</h2>
<p>La page Sources vous montre la répartition de vos leads par canal d'acquisition : LinkedIn, Instagram, site web, bouche-à-oreille, événements, etc. Pour chaque source, vous voyez le nombre de leads, le taux de conversion et le chiffre d'affaires généré.</p>
<p>Cette analyse vous permet d'optimiser votre budget temps et financier en concentrant vos efforts sur les canaux les plus rentables.</p>
<h2>Heatmap d'activité</h2>
<p>La heatmap affiche les jours et heures où vos prospects sont les plus réactifs. Utilisez ces données pour planifier vos sessions de prospection et vos relances aux moments les plus opportuns.</p>`,
    popular: false,
    updatedAt: "2026-01-28",
  },

  // ── Gamification ────────────────────────────────────────────────────
  {
    id: "art-16",
    title: "Comprendre le système de points et niveaux",
    slug: "points-niveaux",
    categoryId: "cat-gamification",
    categoryName: "Gamification",
    excerpt: "Découvrez comment gagner des points et monter en niveau.",
    content: `<h2>Gagner des points</h2>
<p>Chaque action commerciale vous rapporte des points : envoi de DMs, obtention de réponses, booking confirmé, deal créé, deal closé. Le barème est consultable depuis la page Défis. Les actions à forte valeur ajoutée (closing, contrat signé) rapportent plus de points que les actions de volume (DMs envoyés).</p>
<p>Des bonus sont attribués pour les séries (streaks) : maintenez une activité quotidienne régulière pour multiplier vos gains de points.</p>
<h2>Les 5 niveaux</h2>
<p>Le système comporte 5 niveaux : Débutant (0 pts), Confirmé (500 pts), Senior (1 500 pts), Élite (3 500 pts) et Légende (7 000 pts). Chaque niveau débloque des badges et une reconnaissance dans le leaderboard d'équipe.</p>`,
    popular: true,
    updatedAt: "2026-03-03",
  },
  {
    id: "art-17",
    title: "Participer aux défis individuels et d'équipe",
    slug: "defis-individuels-equipe",
    categoryId: "cat-gamification",
    categoryName: "Gamification",
    excerpt: "Relevez des défis pour booster votre motivation et vos performances.",
    content: `<h2>Défis individuels</h2>
<p>Les défis individuels sont des objectifs limités dans le temps : « Closer 5 deals cette semaine », « Obtenir 20 réponses à vos DMs aujourd'hui », etc. Chaque défi réussi rapporte des points bonus et un badge spécial visible sur votre profil.</p>
<p>De nouveaux défis sont proposés chaque semaine par les managers ou générés automatiquement en fonction de vos performances récentes.</p>
<h2>Défis d'équipe</h2>
<p>Les défis d'équipe encouragent la collaboration : « L'équipe doit atteindre 50 000 € de CA ce mois ». Tous les membres contribuent et la progression est visible en temps réel. La récompense est partagée entre tous les participants.</p>`,
    popular: false,
    updatedAt: "2026-02-08",
  },
  {
    id: "art-18",
    title: "Le leaderboard et les streaks",
    slug: "leaderboard-streaks",
    categoryId: "cat-gamification",
    categoryName: "Gamification",
    excerpt: "Comparez-vous à vos collègues et maintenez votre série d'activité.",
    content: `<h2>Le leaderboard</h2>
<p>Le leaderboard classe les membres de l'équipe selon leurs points accumulés sur la période sélectionnée (semaine, mois, trimestre, all-time). Il est accessible depuis la page Équipe et affiche le classement avec l'avatar, le niveau et les points de chaque membre.</p>
<p>Une mention spéciale est attribuée au top 3 avec des médailles or, argent et bronze. Le classement se réinitialise chaque mois pour maintenir la compétition.</p>
<h2>Les streaks</h2>
<p>Un streak est une série de jours consécutifs où vous avez atteint votre quota minimum d'activité. Plus votre streak est long, plus le multiplicateur de points augmente. Attention : manquer un jour remet le compteur à zéro !</p>`,
    popular: false,
    updatedAt: "2026-01-15",
  },

  // ── Communication ───────────────────────────────────────────────────
  {
    id: "art-19",
    title: "Utiliser le chat interne",
    slug: "chat-interne",
    categoryId: "cat-communication",
    categoryName: "Communication",
    excerpt: "Communiquez avec votre équipe via le chat intégré.",
    content: `<h2>Messagerie d'équipe</h2>
<p>Le chat interne vous permet d'échanger en temps réel avec les membres de votre équipe. Créez des canaux thématiques (deals urgents, formation, vie d'équipe) ou envoyez des messages privés. Les fichiers, images et liens sont supportés.</p>
<p>Les messages sont synchronisés sur tous vos appareils grâce à la base temps réel de Supabase. Les notifications push vous alertent des nouveaux messages même lorsque l'application est en arrière-plan.</p>
<h2>Diffusion et replays</h2>
<p>Les managers peuvent envoyer des messages de diffusion à toute l'équipe ou à un groupe spécifique. Les sessions de formation vidéo sont enregistrées et disponibles en replay dans la section dédiée.</p>`,
    popular: false,
    updatedAt: "2026-02-05",
  },
  {
    id: "art-20",
    title: "Configurer l'intégration WhatsApp",
    slug: "integration-whatsapp",
    categoryId: "cat-communication",
    categoryName: "Communication",
    excerpt: "Connectez votre numéro WhatsApp pour communiquer avec vos prospects.",
    content: `<h2>Configuration</h2>
<p>Rendez-vous dans la section WhatsApp > Paramètres pour connecter votre numéro professionnel. Suivez les étapes de vérification et autorisez l'intégration avec l'API WhatsApp Business. Une fois connecté, tous vos messages WhatsApp seront synchronisés dans la plateforme.</p>
<p>Vous pouvez créer des modèles de messages pré-approuvés pour gagner du temps lors de vos échanges avec les prospects.</p>
<h2>Séquences WhatsApp</h2>
<p>Programmez des séquences de messages automatiques via WhatsApp. Définissez les délais, les conditions de déclenchement et le contenu de chaque étape. Les réponses des prospects sont captées en temps réel et mettent en pause la séquence automatiquement.</p>`,
    popular: false,
    updatedAt: "2026-03-06",
  },
  {
    id: "art-21",
    title: "Gérer votre boîte de réception",
    slug: "boite-reception",
    categoryId: "cat-communication",
    categoryName: "Communication",
    excerpt: "Centralisez tous vos messages entrants dans l'Inbox.",
    content: `<h2>L'inbox unifiée</h2>
<p>L'Inbox regroupe tous vos messages entrants, quel que soit le canal d'origine : e-mail, WhatsApp, chat interne ou messages directs des réseaux sociaux. Chaque conversation affiche l'historique complet des échanges et le profil du contact.</p>
<p>Utilisez les filtres pour trier par canal, par statut (non lu, en attente, résolu) ou par priorité. Les conversations peuvent être assignées à un autre membre de l'équipe si nécessaire.</p>
<h2>Réponses rapides</h2>
<p>Gagnez du temps avec les réponses rapides : des templates de réponses pré-configurés que vous pouvez insérer en un clic et personnaliser avant envoi.</p>`,
    popular: false,
    updatedAt: "2026-01-25",
  },

  // ── Paramètres ──────────────────────────────────────────────────────
  {
    id: "art-22",
    title: "Configurer votre branding",
    slug: "configurer-branding",
    categoryId: "cat-parametres",
    categoryName: "Paramètres",
    excerpt: "Personnalisez le logo, les couleurs et les mentions légales.",
    content: `<h2>Branding de la plateforme</h2>
<p>Depuis Paramètres > Branding, uploadez votre logo, définissez vos couleurs principales et secondaires, et personnalisez le favicon. Ces éléments sont appliqués à toute l'interface ainsi qu'aux documents générés (contrats, factures, e-mails).</p>
<p>Le mode White Label permet de supprimer entièrement la marque de la plateforme et de la remplacer par la vôtre. Cette option est disponible dans les forfaits Premium et Enterprise.</p>
<h2>Mentions légales</h2>
<p>Configurez vos mentions légales, conditions générales de vente et politique de confidentialité. Ces textes seront automatiquement inclus dans vos contrats et disponibles sur votre page de booking publique.</p>`,
    popular: false,
    updatedAt: "2026-02-14",
  },
  {
    id: "art-23",
    title: "Gérer les notifications et alertes",
    slug: "notifications-alertes",
    categoryId: "cat-parametres",
    categoryName: "Paramètres",
    excerpt: "Contrôlez les notifications que vous recevez et leur fréquence.",
    content: `<h2>Types de notifications</h2>
<p>La plateforme envoie des notifications pour les événements importants : nouveau deal, booking confirmé, message reçu, facture payée, défi complété, etc. Chaque type peut être activé ou désactivé individuellement.</p>
<p>Les notifications sont disponibles sous 3 formes : in-app (cloche en haut à droite), push (sur mobile et desktop) et e-mail. Vous pouvez choisir le canal préféré pour chaque type d'événement.</p>
<h2>Mode concentration</h2>
<p>Activez le mode concentration pour suspendre toutes les notifications pendant une durée définie. Idéal pour les sessions de prospection intensive ou les appels de closing.</p>`,
    popular: false,
    updatedAt: "2026-02-01",
  },
  {
    id: "art-24",
    title: "Configurer les modes IA",
    slug: "configurer-modes-ia",
    categoryId: "cat-parametres",
    categoryName: "Paramètres",
    excerpt: "Personnalisez les assistants IA selon votre style de vente.",
    content: `<h2>Les modes IA</h2>
<p>La plateforme propose plusieurs modes IA adaptés à différents contextes : prospection, closing, rédaction de contrats et analyse de performances. Chaque mode utilise des prompts optimisés pour vous fournir les suggestions les plus pertinentes.</p>
<p>Depuis Paramètres > Modes IA, vous pouvez ajuster le ton (formel, décontracté, direct), la langue et le niveau de détail des réponses générées par l'IA.</p>
<h2>Entraînement personnalisé</h2>
<p>Alimentez l'IA avec vos propres scripts, objections fréquentes et exemples de messages performants. Plus vous lui fournissez de contexte, plus ses suggestions seront alignées avec votre approche commerciale.</p>`,
    popular: false,
    updatedAt: "2026-03-07",
  },
];

const FAQ_ITEMS: FAQItem[] = [
  {
    id: "faq-01",
    question: "Comment réinitialiser mon mot de passe ?",
    answer: "Cliquez sur « Mot de passe oublié » sur la page de connexion. Un e-mail de réinitialisation sera envoyé à votre adresse. Suivez le lien pour définir un nouveau mot de passe. Le lien est valable 1 heure.",
  },
  {
    id: "faq-02",
    question: "Puis-je utiliser la plateforme sur mobile ?",
    answer: "Oui, la plateforme est une Progressive Web App (PWA). Vous pouvez l'ajouter à votre écran d'accueil depuis votre navigateur mobile pour une expérience native. La navigation mobile est optimisée avec une barre inférieure.",
  },
  {
    id: "faq-03",
    question: "Comment changer mon rôle (setter, closer, manager) ?",
    answer: "Seul un administrateur peut modifier les rôles. Contactez votre manager ou admin qui pourra ajuster votre rôle depuis la section Équipe > Gestion des membres.",
  },
  {
    id: "faq-04",
    question: "Les données sont-elles sécurisées ?",
    answer: "Oui, toutes les données sont stockées sur Supabase avec chiffrement au repos et en transit. L'accès est protégé par Row Level Security (RLS) : chaque utilisateur ne voit que les données autorisées pour son rôle. La plateforme est conforme RGPD.",
  },
  {
    id: "faq-05",
    question: "Comment exporter mes données ?",
    answer: "Depuis chaque section (Contacts, Deals, Analytics), utilisez le bouton d'export pour télécharger vos données au format CSV ou PDF. Les rapports Analytics peuvent également être programmés en envoi automatique par e-mail.",
  },
  {
    id: "faq-06",
    question: "Combien de membres puis-je ajouter à mon équipe ?",
    answer: "Le nombre de membres dépend de votre forfait. Le forfait Starter permet jusqu'à 5 membres, le Pro jusqu'à 20 et l'Enterprise est illimité. Consultez la page Abonnement dans les paramètres pour connaître votre forfait actuel.",
  },
  {
    id: "faq-07",
    question: "Comment fonctionne la page de booking publique ?",
    answer: "Chaque membre dispose d'une URL unique de booking (ex : /book/votre-slug). Partagez ce lien avec vos prospects pour qu'ils réservent un créneau directement dans votre agenda. Les disponibilités sont synchronisées automatiquement.",
  },
  {
    id: "faq-08",
    question: "Puis-je personnaliser les étapes du pipeline ?",
    answer: "Oui, les administrateurs peuvent ajouter, supprimer et réorganiser les étapes du pipeline depuis les paramètres du CRM. Chaque étape possède un nom et une couleur personnalisables.",
  },
  {
    id: "faq-09",
    question: "Comment fonctionne le système de streak ?",
    answer: "Un streak est une série de jours consécutifs d'activité. Chaque jour où vous atteignez votre quota minimum (configurable), votre streak augmente de 1. Un streak actif augmente votre multiplicateur de points. Manquer un jour remet le compteur à zéro.",
  },
  {
    id: "faq-10",
    question: "Comment contacter le support technique ?",
    answer: "Utilisez le formulaire de contact en bas de cette page ou envoyez un e-mail à support@sales-system.fr. Notre équipe répond sous 24 heures ouvrées. Les forfaits Enterprise bénéficient d'un support prioritaire par chat en direct.",
  },
  {
    id: "faq-11",
    question: "Qu'est-ce que le mode Role-Play ?",
    answer: "Le Role-Play est un outil d'entraînement où vous simulez des appels de vente avec un partenaire ou une IA. Après chaque session, un debrief analyse votre performance : argumentation, gestion des objections, taux de closing simulé.",
  },
  {
    id: "faq-12",
    question: "Comment fonctionnent les séquences automatiques ?",
    answer: "Les séquences sont des suites de messages programmés envoyés automatiquement à vos prospects. Vous définissez le contenu, les délais entre chaque message et les conditions d'arrêt (réponse, booking, désabonnement). Elles sont disponibles pour l'e-mail et WhatsApp.",
  },
  {
    id: "faq-13",
    question: "Puis-je intégrer d'autres outils ?",
    answer: "La Marketplace propose des extensions et intégrations partenaires. Vous pouvez également utiliser les webhooks et l'API pour connecter vos outils existants (Calendly, Stripe, Slack, etc.).",
  },
];

// ─── Server actions ───────────────────────────────────────────────────

export async function getHelpCategories(): Promise<HelpCategory[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  return CATEGORIES;
}

export async function getHelpArticles(
  categoryId?: string,
  search?: string
): Promise<HelpArticle[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  let filtered = [...ARTICLES];

  if (categoryId) {
    filtered = filtered.filter((a) => a.categoryId === categoryId);
  }

  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.excerpt.toLowerCase().includes(q) ||
        a.content.toLowerCase().includes(q)
    );
  }

  return filtered;
}

export async function getHelpArticle(
  articleId: string
): Promise<HelpArticle | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  return ARTICLES.find((a) => a.id === articleId) || null;
}

export async function getFAQ(): Promise<FAQItem[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  return FAQ_ITEMS;
}

export async function submitFeedback(
  articleId: string,
  helpful: boolean
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  // In a real implementation, this would store feedback in a table.
  // For now, we just validate the article exists.
  const article = ARTICLES.find((a) => a.id === articleId);
  if (!article) throw new Error("Article introuvable");

  revalidatePath("/help");
}
