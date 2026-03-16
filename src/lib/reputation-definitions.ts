import {
  Sprout,
  MessageSquare,
  Award,
  GraduationCap,
  Crown,
  type LucideIcon,
} from "lucide-react";

export type ReputationRank =
  | "novice"
  | "contributeur"
  | "expert"
  | "mentor"
  | "legende";

export interface ReputationRankInfo {
  rank: ReputationRank;
  name: string;
  minPoints: number;
  icon: LucideIcon;
  color: string;
}

export const REPUTATION_RANKS: ReputationRankInfo[] = [
  {
    rank: "novice",
    name: "Novice",
    minPoints: 0,
    icon: Sprout,
    color: "#94a3b8",
  },
  {
    rank: "contributeur",
    name: "Contributeur",
    minPoints: 100,
    icon: MessageSquare,
    color: "#3b82f6",
  },
  {
    rank: "expert",
    name: "Expert",
    minPoints: 500,
    icon: Award,
    color: "#8b5cf6",
  },
  {
    rank: "mentor",
    name: "Mentor",
    minPoints: 1500,
    icon: GraduationCap,
    color: "#f59e0b",
  },
  {
    rank: "legende",
    name: "Légende",
    minPoints: 5000,
    icon: Crown,
    color: "#fbbf24",
  },
];

export function getReputationRank(points: number): ReputationRankInfo {
  let current = REPUTATION_RANKS[0];
  for (const rank of REPUTATION_RANKS) {
    if (points >= rank.minPoints) {
      current = rank;
    }
  }
  return current;
}

export function getNextRank(points: number): ReputationRankInfo | null {
  for (const rank of REPUTATION_RANKS) {
    if (points < rank.minPoints) {
      return rank;
    }
  }
  return null;
}
