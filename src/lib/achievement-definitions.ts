export interface Achievement {
  id: string;
  name: string;
  description: string;
  /** lucide-react icon name */
  icon: string;
  /** Hex colour for the icon */
  color: string;
  category:
    | "deals"
    | "appels"
    | "prospection"
    | "streaks"
    | "social"
    | "hidden";
  tier: "bronze" | "silver" | "gold" | "platinum";
  /** Human-readable requirement description */
  requirement: string;
  /** Numeric target to reach */
  targetValue: number;
  /** Whether the achievement is hidden until unlocked */
  hidden: boolean;
  /** Points awarded when completed */
  points: number;
}

export const TIER_COLORS: Record<Achievement["tier"], string> = {
  bronze: "#cd7f32",
  silver: "#c0c0c0",
  gold: "#ffd700",
  platinum: "#e5e4e2",
};

export const CATEGORY_LABELS: Record<Achievement["category"], string> = {
  deals: "Deals",
  appels: "Appels",
  prospection: "Prospection",
  streaks: "Streaks",
  social: "Social",
  hidden: "Cachés",
};

export const ACHIEVEMENTS: Achievement[] = [
  // ─── Deals ──────────────────────────────────────────────────────────
  {
    id: "first_deal_ach",
    name: "Premier deal",
    description: "Conclure votre tout premier deal",
    icon: "Handshake",
    color: "#10b981",
    category: "deals",
    tier: "bronze",
    requirement: "Conclure 1 deal",
    targetValue: 1,
    hidden: false,
    points: 50,
  },
  {
    id: "confirmed_seller",
    name: "Vendeur confirmé",
    description: "Prouver votre valeur avec 10 deals conclus",
    icon: "TrendingUp",
    color: "#3b82f6",
    category: "deals",
    tier: "silver",
    requirement: "Conclure 10 deals",
    targetValue: 10,
    hidden: false,
    points: 150,
  },
  {
    id: "closing_machine",
    name: "Machine à closer",
    description: "50 deals conclus — vous êtes une machine !",
    icon: "Zap",
    color: "#f59e0b",
    category: "deals",
    tier: "gold",
    requirement: "Conclure 50 deals",
    targetValue: 50,
    hidden: false,
    points: 400,
  },
  {
    id: "closing_king",
    name: "Roi du closing",
    description: "100 deals conclus, vous régnez en maître",
    icon: "Crown",
    color: "#ffd700",
    category: "deals",
    tier: "platinum",
    requirement: "Conclure 100 deals",
    targetValue: 100,
    hidden: false,
    points: 800,
  },

  // ─── Appels ─────────────────────────────────────────────────────────
  {
    id: "first_call_ach",
    name: "Premier appel",
    description: "Passer votre premier appel commercial",
    icon: "Phone",
    color: "#10b981",
    category: "appels",
    tier: "bronze",
    requirement: "Passer 1 appel",
    targetValue: 1,
    hidden: false,
    points: 30,
  },
  {
    id: "telephoniste",
    name: "Téléphoniste",
    description: "25 appels passés — le téléphone n'a plus de secret",
    icon: "PhoneCall",
    color: "#3b82f6",
    category: "appels",
    tier: "silver",
    requirement: "Passer 25 appels",
    targetValue: 25,
    hidden: false,
    points: 100,
  },
  {
    id: "call_center",
    name: "Call center",
    description: "100 appels — vous êtes un centre d'appels à vous seul",
    icon: "Headphones",
    color: "#f59e0b",
    category: "appels",
    tier: "gold",
    requirement: "Passer 100 appels",
    targetValue: 100,
    hidden: false,
    points: 300,
  },
  {
    id: "marathon_calls",
    name: "Marathon appels",
    description: "500 appels passés, un véritable marathon",
    icon: "PhoneForwarded",
    color: "#ef4444",
    category: "appels",
    tier: "platinum",
    requirement: "Passer 500 appels",
    targetValue: 500,
    hidden: false,
    points: 600,
  },

  // ─── Prospection ────────────────────────────────────────────────────
  {
    id: "lead_hunter",
    name: "Chasseur de leads",
    description: "Ajouter 10 prospects à votre pipeline",
    icon: "Target",
    color: "#8b5cf6",
    category: "prospection",
    tier: "bronze",
    requirement: "Ajouter 10 prospects",
    targetValue: 10,
    hidden: false,
    points: 50,
  },
  {
    id: "elite_prospector",
    name: "Prospecteur d'élite",
    description: "50 prospects ajoutés — un vrai chasseur",
    icon: "Crosshair",
    color: "#6366f1",
    category: "prospection",
    tier: "silver",
    requirement: "Ajouter 50 prospects",
    targetValue: 50,
    hidden: false,
    points: 200,
  },
  {
    id: "golden_network",
    name: "Réseau d'or",
    description: "200 prospects — votre réseau vaut de l'or",
    icon: "Network",
    color: "#ffd700",
    category: "prospection",
    tier: "gold",
    requirement: "Ajouter 200 prospects",
    targetValue: 200,
    hidden: false,
    points: 500,
  },

  // ─── Streaks ────────────────────────────────────────────────────────
  {
    id: "regular",
    name: "Régulier",
    description: "Maintenir un streak de 7 jours consécutifs",
    icon: "Flame",
    color: "#f59e0b",
    category: "streaks",
    tier: "bronze",
    requirement: "Streak de 7 jours",
    targetValue: 7,
    hidden: false,
    points: 100,
  },
  {
    id: "constant",
    name: "Constant",
    description: "30 jours de streak — la constance paie",
    icon: "Flame",
    color: "#ef4444",
    category: "streaks",
    tier: "silver",
    requirement: "Streak de 30 jours",
    targetValue: 30,
    hidden: false,
    points: 300,
  },
  {
    id: "unstoppable",
    name: "Inarrêtable",
    description: "90 jours sans interruption — rien ne vous arrête",
    icon: "Flame",
    color: "#dc2626",
    category: "streaks",
    tier: "gold",
    requirement: "Streak de 90 jours",
    targetValue: 90,
    hidden: false,
    points: 600,
  },
  {
    id: "machine_streak",
    name: "Machine",
    description: "365 jours de streak — vous êtes une machine",
    icon: "Flame",
    color: "#b91c1c",
    category: "streaks",
    tier: "platinum",
    requirement: "Streak de 365 jours",
    targetValue: 365,
    hidden: false,
    points: 1500,
  },

  // ─── Social ─────────────────────────────────────────────────────────
  {
    id: "first_post",
    name: "Première publication",
    description: "Publier votre premier message dans la communauté",
    icon: "MessageSquare",
    color: "#06b6d4",
    category: "social",
    tier: "bronze",
    requirement: "Publier 1 message",
    targetValue: 1,
    hidden: false,
    points: 30,
  },
  {
    id: "influencer",
    name: "Influenceur",
    description: "25 publications dans la communauté",
    icon: "Megaphone",
    color: "#8b5cf6",
    category: "social",
    tier: "silver",
    requirement: "Publier 25 messages",
    targetValue: 25,
    hidden: false,
    points: 150,
  },
  {
    id: "community_leader",
    name: "Leader communautaire",
    description: "100 publications — vous animez la communauté",
    icon: "Users",
    color: "#10b981",
    category: "social",
    tier: "gold",
    requirement: "Publier 100 messages",
    targetValue: 100,
    hidden: false,
    points: 400,
  },

  // ─── Hidden ─────────────────────────────────────────────────────────
  {
    id: "night_owl",
    name: "Noctambule",
    description: "Effectuer une action après minuit",
    icon: "Moon",
    color: "#6366f1",
    category: "hidden",
    tier: "silver",
    requirement: "Action après minuit",
    targetValue: 1,
    hidden: true,
    points: 75,
  },
  {
    id: "early_bird",
    name: "Early bird",
    description: "Effectuer une action avant 6h du matin",
    icon: "Sunrise",
    color: "#f59e0b",
    category: "hidden",
    tier: "silver",
    requirement: "Action avant 6h",
    targetValue: 1,
    hidden: true,
    points: 75,
  },
  {
    id: "speed_closer",
    name: "Speed closer",
    description: "Conclure un deal en moins de 24 heures",
    icon: "Timer",
    color: "#ef4444",
    category: "hidden",
    tier: "gold",
    requirement: "Deal conclu en < 24h",
    targetValue: 1,
    hidden: true,
    points: 200,
  },
];
