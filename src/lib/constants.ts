import {
  LayoutDashboard,
  Kanban,
  Users,
  CalendarDays,
  FileText,
  GraduationCap,
  MessageSquare,
  BarChart3,
  Target,
  Newspaper,
  Heart,
  Trophy,
  UserCircle,
  Settings,
  UsersRound,
  BookOpen,
  ShieldAlert,
  Shield,
  Video,
  FolderOpen,
  LineChart,
  Gift,
  Inbox,
  Swords,
  MessageCircle,
  ScrollText,
  Bot,
  Bell,
  Building2,
  Zap,
  Store,
  SlidersHorizontal,
  Code,
  Plug,
  HelpCircle,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import type { UserRole } from "@/lib/types/database";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  roles: UserRole[];
  children?: NavItem[];
}

export const NAV_ITEMS: NavItem[] = [
  // Shared
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["admin", "manager", "setter", "closer", "client_b2b", "client_b2c"],
  },

  // Admin/Manager
  {
    label: "CRM",
    href: "/crm",
    icon: Kanban,
    roles: ["admin", "manager", "setter", "closer"],
  },
  {
    label: "Contacts",
    href: "/contacts",
    icon: Users,
    roles: ["admin", "manager"],
  },
  {
    label: "Bookings",
    href: "/bookings",
    icon: CalendarDays,
    roles: ["admin", "manager", "setter", "closer", "client_b2b", "client_b2c"],
  },
  {
    label: "Contrats",
    href: "/contracts",
    icon: FileText,
    roles: ["admin", "manager"],
  },
  {
    label: "Academy",
    href: "/academy",
    icon: GraduationCap,
    roles: ["admin", "manager", "setter", "closer", "client_b2c"],
  },
  {
    label: "Équipe",
    href: "/team",
    icon: UsersRound,
    roles: ["admin", "manager"],
  },
  {
    label: "Affectations",
    href: "/team/assignments",
    icon: UsersRound,
    roles: ["admin", "manager"],
  },
  {
    label: "Analytics",
    href: "/analytics",
    icon: BarChart3,
    roles: ["admin", "manager"],
  },
  {
    label: "Ma performance",
    href: "/analytics/performance",
    icon: BarChart3,
    roles: ["setter", "closer"],
  },
  {
    label: "Sources",
    href: "/analytics/sources",
    icon: Target,
    roles: ["admin", "manager"],
  },
  {
    label: "Objections",
    href: "/analytics/objections",
    icon: Shield,
    roles: ["admin", "manager"],
  },
  {
    label: "Journal EOD",
    href: "/journal",
    icon: BookOpen,
    roles: ["setter", "closer"],
  },
  {
    label: "Prospection",
    href: "/prospecting",
    icon: Target,
    roles: ["admin", "manager", "setter", "closer"],
  },
  {
    label: "Content",
    href: "/content",
    icon: Newspaper,
    roles: ["admin", "manager"],
  },
  {
    label: "Clients",
    href: "/customers",
    icon: Heart,
    roles: ["admin", "manager"],
  },
  {
    label: "Communauté",
    href: "/community",
    icon: UsersRound,
    roles: ["admin", "manager", "client_b2c"],
  },

  // Inbox (DM conversations)
  {
    label: "Inbox",
    href: "/inbox",
    icon: Inbox,
    roles: ["admin", "manager", "setter", "closer"],
  },

  // Chat
  {
    label: "Chat",
    href: "/chat",
    icon: MessageSquare,
    roles: ["admin", "manager", "setter", "closer", "client_b2b", "client_b2c"],
  },

  // Setter/Closer specific
  {
    label: "Role-Play",
    href: "/roleplay",
    icon: Swords,
    roles: ["admin", "manager", "setter", "closer"],
  },
  {
    label: "Scripts",
    href: "/scripts",
    icon: ScrollText,
    roles: ["admin", "manager", "setter", "closer"],
  },
  {
    label: "WhatsApp",
    href: "/whatsapp",
    icon: MessageCircle,
    roles: ["admin", "manager", "setter"],
  },
  {
    label: "Automation",
    href: "/automation",
    icon: Zap,
    roles: ["admin", "manager"],
  },
  {
    label: "Marketplace",
    href: "/marketplace",
    icon: Store,
    roles: ["setter", "closer"],
  },
  {
    label: "Défis",
    href: "/challenges",
    icon: Trophy,
    roles: ["setter", "closer"],
  },

  // Client specific
  {
    label: "Portail",
    href: "/portal",
    icon: Building2,
    roles: ["client_b2b"],
  },
  {
    label: "Calls",
    href: "/calls",
    icon: Video,
    roles: ["client_b2b", "client_b2c"],
  },
  {
    label: "Ressources",
    href: "/resources",
    icon: FolderOpen,
    roles: ["client_b2b", "client_b2c"],
  },
  {
    label: "Mes KPIs",
    href: "/kpis",
    icon: LineChart,
    roles: ["client_b2b", "client_b2c"],
  },
  {
    label: "Parrainage",
    href: "/referral",
    icon: Gift,
    roles: ["client_b2b", "client_b2c"],
  },

  // Client B2B/B2C - CRM simplifié
  {
    label: "Mes Prospects",
    href: "/prospects",
    icon: Target,
    roles: ["client_b2b", "client_b2c"],
  },
  // Client B2B - Settings IA
  {
    label: "Settings IA",
    href: "/settings-ia",
    icon: Bot,
    roles: ["client_b2b"],
  },
  // Client B2B + B2C - Scripts IA
  {
    label: "Scripts IA",
    href: "/ai-scripts",
    icon: Sparkles,
    roles: ["client_b2b", "client_b2c"],
  },

  // Help
  {
    label: "Centre d'aide",
    href: "/help",
    icon: HelpCircle,
    roles: ["admin", "manager", "setter", "closer", "client_b2b", "client_b2c"],
  },

  // Profile & Settings
  {
    label: "Profil",
    href: "/profile",
    icon: UserCircle,
    roles: ["setter", "closer", "client_b2b", "client_b2c"],
  },
  {
    label: "Paramètres",
    href: "/settings",
    icon: Settings,
    roles: ["admin", "manager"],
    children: [
      {
        label: "Général",
        href: "/settings",
        icon: Settings,
        roles: ["admin", "manager"],
      },
      {
        label: "Onboarding",
        href: "/settings/onboarding",
        icon: BookOpen,
        roles: ["admin", "manager"],
      },
      {
        label: "Modes IA",
        href: "/settings/ai-modes",
        icon: Bot,
        roles: ["admin", "manager"],
      },
      {
        label: "White Label",
        href: "/settings/white-label",
        icon: Building2,
        roles: ["admin", "manager"],
      },
      {
        label: "Notifications",
        href: "/settings/notifications",
        icon: Bell,
        roles: ["admin", "manager"],
      },
      {
        label: "Confidentialité & RGPD",
        href: "/settings/privacy",
        icon: Shield,
        roles: ["admin", "manager"],
      },
      {
        label: "Sécurité & 2FA",
        href: "/settings/security",
        icon: ShieldAlert,
        roles: ["admin", "manager"],
      },
      {
        label: "Champs personnalisés",
        href: "/settings/custom-fields",
        icon: SlidersHorizontal,
        roles: ["admin", "manager"],
      },
      {
        label: "API REST",
        href: "/settings/api",
        icon: Code,
        roles: ["admin", "manager"],
      },
      {
        label: "Intégrations",
        href: "/settings/integrations",
        icon: Plug,
        roles: ["admin"],
      },
      {
        label: "Sync Calendrier",
        href: "/bookings/calendar-sync",
        icon: CalendarDays,
        roles: ["admin", "manager"],
      },
    ],
  },
];

export interface NavSection {
  label: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    label: "",
    items: NAV_ITEMS.filter((i) => i.href === "/dashboard"),
  },
  {
    label: "Ventes",
    items: NAV_ITEMS.filter((i) =>
      [
        "/crm",
        "/contacts",
        "/bookings",
        "/contracts",
        "/analytics",
        "/analytics/performance",
        "/analytics/sources",
        "/analytics/objections",
        "/journal",
      ].includes(i.href),
    ),
  },
  {
    label: "Communication",
    items: NAV_ITEMS.filter((i) =>
      ["/inbox", "/chat", "/whatsapp"].includes(i.href),
    ),
  },
  {
    label: "Prospection",
    items: NAV_ITEMS.filter((i) =>
      ["/prospecting", "/roleplay", "/scripts", "/automation"].includes(i.href),
    ),
  },
  {
    label: "Formation",
    items: NAV_ITEMS.filter((i) =>
      ["/academy", "/community", "/challenges"].includes(i.href),
    ),
  },
  {
    label: "Gestion",
    items: NAV_ITEMS.filter((i) =>
      [
        "/team",
        "/team/assignments",
        "/content",
        "/customers",
        "/marketplace",
      ].includes(i.href),
    ),
  },
  {
    label: "Espace Client",
    items: NAV_ITEMS.filter((i) =>
      [
        "/portal",
        "/calls",
        "/resources",
        "/kpis",
        "/referral",
        "/prospects",
      ].includes(i.href),
    ),
  },
  {
    label: "Outils IA",
    items: NAV_ITEMS.filter((i) =>
      ["/settings-ia", "/ai-scripts"].includes(i.href),
    ),
  },
  {
    label: "Aide",
    items: NAV_ITEMS.filter((i) => ["/help"].includes(i.href)),
  },
];

// Breadcrumb labels pour les segments d'URL
export const BREADCRUMB_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  crm: "CRM",
  contacts: "Contacts",
  bookings: "Bookings",
  contracts: "Contrats",
  analytics: "Analytics",
  projections: "Projections",
  nps: "NPS & Satisfaction",
  academy: "Academy",
  team: "Équipe",
  assignments: "Affectations",
  prospecting: "Prospection",
  hub: "Hub",
  linkedin: "LinkedIn",
  instagram: "Instagram",
  "follow-ups": "Relances",
  scoring: "Scoring",
  templates: "Templates",
  campaigns: "Campagnes",
  inbox: "Inbox",
  chat: "Chat",
  broadcast: "Diffusion",
  video: "Vidéo",
  replays: "Replays",
  whatsapp: "WhatsApp",
  settings: "Paramètres",
  sequences: "Séquences",
  roleplay: "Role-Play",
  reviews: "Analyse d'appels",
  scripts: "Scripts",
  training: "Entraînement",
  automation: "Automation",
  marketplace: "Marketplace",
  monetization: "Monétisation",
  challenges: "Défis",
  achievements: "Achievements",
  community: "Communauté",
  reputation: "Réputation",
  portal: "Portail",
  onboarding: "Onboarding",
  calls: "Appels",
  resources: "Ressources",
  kpis: "KPIs",
  referral: "Parrainage",
  profile: "Profil",
  content: "Contenus",
  customers: "Clients",
  notifications: "Notifications",
  "ai-modes": "Modes IA",
  "white-label": "White Label",
  "custom-fields": "Champs personnalisés",
  branding: "Branding",
  subscription: "Abonnement",
  voice: "Voix",
  timeline: "Parcours",
  simulator: "Simulateur",
  privacy: "Confidentialité & RGPD",
  security: "Sécurité & 2FA",
  duplicates: "Doublons",
  intelligence: "Hunting Intelligence",
  certificates: "Certificats",
  diagnostic: "Diagnostic",
  path: "Parcours d'apprentissage",
  import: "Import en masse",
  reports: "Rapports",
  journal: "Journal EOD",
  sources: "Sources",
  objections: "Objections",
  roadmap: "Roadmap",
  enrichment: "Enrichissement IA",
  segments: "Segmentation",
  support: "Support",
  help: "Centre d'aide",
  groups: "Groupes d'entraînement",
  prospects: "Mes Prospects",
  "settings-ia": "Settings IA",
  "ai-scripts": "Scripts IA",
  api: "API REST",
  integrations: "Intégrations",
  coaching: "Coaching",
  partners: "Partenaires",
  moderation: "Modération",
  migration: "Migration CRM",
};

export const PIPELINE_DEFAULT_STAGES = [
  { name: "Prospect", color: "#6b6b6b", position: 0 },
  { name: "Contacté", color: "#3b82f6", position: 1 },
  { name: "Appel Découverte", color: "#f59e0b", position: 2 },
  { name: "Proposition", color: "#8b5cf6", position: 3 },
  { name: "Closing", color: "#ef4444", position: 4 },
  { name: "Client Signé", color: "#7af17a", position: 5 },
];

export const GAMIFICATION_LEVELS = [
  { level: 1, name: "Setter Débutant", min_points: 0 },
  { level: 2, name: "Setter Confirmé", min_points: 500 },
  { level: 3, name: "Setter Senior", min_points: 1500 },
  { level: 4, name: "Setter Elite", min_points: 3500 },
  { level: 5, name: "Setter Légende", min_points: 7000 },
];
