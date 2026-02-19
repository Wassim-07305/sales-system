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
  Video,
  FolderOpen,
  LineChart,
  Gift,
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
    roles: ["admin", "manager", "setter", "closer"],
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
    label: "Équipe",
    href: "/team",
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
    roles: ["admin", "manager", "client_b2b", "client_b2c"],
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
    label: "Défis",
    href: "/challenges",
    icon: Trophy,
    roles: ["setter", "closer"],
  },

  // Client specific
  {
    label: "Onboarding",
    href: "/onboarding",
    icon: BookOpen,
    roles: ["client_b2b", "client_b2c"],
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
  },
];

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
