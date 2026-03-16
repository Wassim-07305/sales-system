"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Trophy } from "lucide-react";
import { ReputationBadge } from "./reputation-badge";

export interface LeaderboardEntry {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  score: number;
}

const podiumColors = [
  "text-amber-500 bg-amber-500/10 ring-amber-500/20", // 1st
  "text-gray-400 bg-gray-400/10 ring-gray-400/20", // 2nd
  "text-amber-700 bg-amber-700/10 ring-amber-700/20", // 3rd
];

export function LeaderboardCard({ entries }: { entries: LeaderboardEntry[] }) {
  if (entries.length === 0) return null;

  return (
    <Card>
      <CardContent className="px-5 py-5">
        <h3 className="font-semibold text-sm flex items-center gap-2 mb-5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
            <Trophy className="h-4 w-4 text-amber-500" />
          </span>
          Top contributeurs
        </h3>
        <div className="space-y-2">
          {entries.map((entry, idx) => (
            <div
              key={entry.user_id}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${
                idx < 3 ? "bg-muted/40" : "hover:bg-muted/30"
              }`}
            >
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ring-1 shrink-0 ${
                  idx < 3
                    ? podiumColors[idx]
                    : "text-muted-foreground bg-transparent ring-border"
                }`}
              >
                {idx + 1}
              </span>
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-brand/20 to-brand/5 flex items-center justify-center text-brand text-xs font-bold shrink-0 ring-1 ring-brand/15">
                {entry.full_name?.charAt(0)?.toUpperCase() || "?"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {entry.full_name || "Anonyme"}
                </p>
              </div>
              <ReputationBadge score={entry.score} showScore />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
