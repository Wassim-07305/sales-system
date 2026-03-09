export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  /** lucide-react icon name (mapped on the client) */
  icon: string;
  /** Hex colour used for the icon when earned */
  color: string;
  /** Points awarded when the badge is earned */
  points: number;
  category: "performance" | "streak" | "social" | "milestone";
}

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    id: "first_deal",
    name: "Premier Deal",
    description: "Conclure votre premier deal",
    icon: "Handshake",
    color: "#7af17a",
    points: 50,
    category: "performance",
  },
  {
    id: "week_streak",
    name: "Flamme Hebdo",
    description: "Maintenir un streak de 7 jours",
    icon: "Flame",
    color: "#f59e0b",
    points: 100,
    category: "streak",
  },
  {
    id: "month_streak",
    name: "Flamme Mensuelle",
    description: "Maintenir un streak de 30 jours",
    icon: "Flame",
    color: "#ef4444",
    points: 300,
    category: "streak",
  },
  {
    id: "10_calls",
    name: "Appelant Assidu",
    description: "Effectuer 10 appels",
    icon: "Phone",
    color: "#3b82f6",
    points: 30,
    category: "performance",
  },
  {
    id: "50_calls",
    name: "Machine a Appels",
    description: "Effectuer 50 appels",
    icon: "PhoneCall",
    color: "#6366f1",
    points: 150,
    category: "performance",
  },
  {
    id: "closer_star",
    name: "Closer Star",
    description: "Fermer 5 deals avec succes",
    icon: "Star",
    color: "#eab308",
    points: 200,
    category: "performance",
  },
  {
    id: "prospecting_pro",
    name: "Pro du Prospecting",
    description: "Ajouter 50 prospects",
    icon: "Target",
    color: "#8b5cf6",
    points: 200,
    category: "performance",
  },
  {
    id: "team_player",
    name: "Esprit d'Equipe",
    description: "Publier 10 messages dans la communaute",
    icon: "Users",
    color: "#06b6d4",
    points: 80,
    category: "social",
  },
  {
    id: "speed_demon",
    name: "Vitesse Eclair",
    description: "Conclure 3 deals en une semaine",
    icon: "Zap",
    color: "#f97316",
    points: 250,
    category: "performance",
  },
  {
    id: "legend",
    name: "Legende",
    description: "Atteindre le niveau 5 (Setter Legende)",
    icon: "Crown",
    color: "#fbbf24",
    points: 500,
    category: "milestone",
  },
];
