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
  Swords,
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
  Radio,
  Presentation,
  Link2,
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
    roles: ["admin", "manager", "csm", "setter", "closer", "client_b2b", "client_b2c"],
  },

  // Admin/Manager + B2B (lecture seule pour B2B)
  {
    label: "CRM",
    href: "/crm",
    icon: Kanban,
    roles: ["admin", "manager", "csm", "setter", "closer", "client_b2b"],
  },
  {
    label: "Utilisateurs",
    href: "/utilisateurs",
    icon: Users,
    roles: ["admin", "manager", "csm"],
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
    roles: ["admin", "manager", "setter", "closer", "client_b2b", "client_b2c"],
  },
  {
    label: "Analytics",
    href: "/analytics",
    icon: BarChart3,
    roles: ["admin", "manager", "setter", "closer"],
  },
  {
    label: "Journal EOD",
    href: "/journal",
    icon: BookOpen,
    roles: ["setter", "closer"],
  },
  {
    label: "EOD Équipe",
    href: "/team/journal",
    icon: BookOpen,
    roles: ["admin", "manager", "client_b2b"],
  },
  {
    label: "Prospection",
    href: "/prospecting",
    icon: Target,
    roles: ["admin", "manager", "setter", "closer"],
  },
  {
    label: "Hub",
    href: "/prospecting/linkhub",
    icon: Link2,
    roles: ["admin", "manager", "setter", "closer"],
  },
  {
    label: "Content",
    href: "/content",
    icon: Newspaper,
    roles: ["admin", "manager"],
  },
  {
    label: "Communauté",
    href: "/community",
    icon: UsersRound,
    roles: ["admin", "manager", "csm", "client_b2c"],
  },

  // Messages (unified: team channels, DMs, WhatsApp, Inbox)
  {
    label: "Messages",
    href: "/chat",
    icon: MessageSquare,
    roles: ["admin", "manager", "setter", "closer", "client_b2b", "client_b2c"],
  },

  // Live (video calls, screen share, lives)
  {
    label: "Appels & Live",
    href: "/live",
    icon: Radio,
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
    label: "GenSpark",
    href: "/genspark",
    icon: Presentation,
    roles: ["admin", "manager", "setter", "closer"],
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
    label: "Mon ESOP",
    href: "/portal/esop",
    icon: FileText,
    roles: ["client_b2b"],
  },
  {
    label: "Mes SOPs",
    href: "/portal/sops",
    icon: FileText,
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
    items: NAV_ITEMS.filter((i) =>
      ["/dashboard", "/chat", "/live"].includes(i.href),
    ),
  },
  {
    label: "Ventes",
    items: NAV_ITEMS.filter((i) =>
      ["/crm", "/bookings", "/contracts", "/analytics", "/journal", "/team/journal"].includes(
        i.href,
      ),
    ),
  },
  {
    label: "Prospection",
    items: NAV_ITEMS.filter((i) =>
      ["/prospecting", "/prospecting/linkhub", "/roleplay", "/scripts", "/automation"].includes(i.href),
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
      ["/content", "/marketplace"].includes(i.href),
    ),
  },
  {
    label: "Utilisateurs",
    items: NAV_ITEMS.filter((i) => ["/utilisateurs"].includes(i.href)),
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
      ["/settings-ia", "/ai-scripts", "/genspark"].includes(i.href),
    ),
  },
];

// Breadcrumb labels pour les segments d'URL
export const BREADCRUMB_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  crm: "CRM",
  contacts: "Contacts",
  utilisateurs: "Utilisateurs",
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
  linkhub: "Hub",
  linkedin: "LinkedIn",
  instagram: "Instagram",
  "follow-ups": "Relances",
  scoring: "Scoring",
  templates: "Templates",
  campaigns: "Campagnes",
  inbox: "Inbox",
  chat: "Messages",
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
  discovery: "Découverte Leads",
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
  genspark: "GenSpark",
  live: "Live",
  coaching: "Coaching",
  partners: "Partenaires",
  moderation: "Modération",
  migration: "Migration CRM",
  "linkedin-engage": "LinkedIn Engage",
  feeds: "Feeds",
  "mon-style": "Mon Style",
  recommandations: "Recommandations",
  replies: "Réponses",
  session: "Session",
  stats: "Statistiques",
};

// ─── Booking Pages ─────────────────────────────────────────────────────────

export const DAYS_OF_WEEK = [
  { value: 0, label: "Dimanche", short: "Dim" },
  { value: 1, label: "Lundi", short: "Lun" },
  { value: 2, label: "Mardi", short: "Mar" },
  { value: 3, label: "Mercredi", short: "Mer" },
  { value: 4, label: "Jeudi", short: "Jeu" },
  { value: 5, label: "Vendredi", short: "Ven" },
  { value: 6, label: "Samedi", short: "Sam" },
];

export const SLOT_DURATIONS = [
  { value: 15, label: "15 min" },
  { value: 30, label: "30 min" },
  { value: 45, label: "45 min" },
  { value: 60, label: "1h" },
  { value: 90, label: "1h30" },
];

export const QUALIFICATION_FIELD_TYPES = [
  { value: "text", label: "Texte court" },
  { value: "textarea", label: "Texte long" },
  { value: "select", label: "Liste déroulante" },
  { value: "multi_select", label: "Choix multiples" },
  { value: "number", label: "Nombre" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Téléphone" },
] as const;

export const CALL_RESULT_OPTIONS = [
  {
    value: "vente_realisee",
    label: "Vente réalisée",
    color: "bg-brand/10 text-brand border-brand/20",
  },
  {
    value: "non_realisee",
    label: "Non réalisée",
    color: "bg-foreground/10 text-foreground border-foreground/20",
  },
  {
    value: "suivi_prevu",
    label: "Suivi prévu",
    color: "bg-muted/60 text-muted-foreground border-border/50",
  },
  {
    value: "no_show",
    label: "No show",
    color: "bg-muted/40 text-muted-foreground/60 border-border/30",
  },
] as const;

export const LEAD_STATUS_LABELS: Record<string, string> = {
  new: "Nouveau",
  qualified: "Qualifié",
  booked: "RDV pris",
  disqualified: "Disqualifié",
  lost: "Perdu",
};

export const LEAD_STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  qualified: "bg-brand/10 text-brand border-brand/20",
  booked: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  disqualified: "bg-muted/40 text-muted-foreground border-border/30",
  lost: "bg-red-500/10 text-red-500 border-red-500/20",
};

export const PIPELINE_DEFAULT_STAGES = [
  { name: "Nouveau lead", color: "#6b6b6b", position: 0 },
  { name: "Contacté", color: "#3b82f6", position: 1 },
  { name: "Relancé", color: "#f59e0b", position: 2 },
  { name: "Call booké", color: "#8b5cf6", position: 3 },
  { name: "Fermé (gagné)", color: "#7af17a", position: 4 },
  { name: "Fermé (perdu)", color: "#ef4444", position: 5 },
];

export const GAMIFICATION_LEVELS = [
  { level: 1, name: "Setter Débutant", min_points: 0 },
  { level: 2, name: "Setter Confirmé", min_points: 500 },
  { level: 3, name: "Setter Senior", min_points: 1500 },
  { level: 4, name: "Setter Elite", min_points: 3500 },
  { level: 5, name: "Setter Légende", min_points: 7000 },
];
