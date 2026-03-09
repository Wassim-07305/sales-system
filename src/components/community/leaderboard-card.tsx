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

export function LeaderboardCard({ entries }: { entries: LeaderboardEntry[] }) {
  if (entries.length === 0) return null;

  return (
    <Card>
      <CardContent className="p-5">
        <h3 className="font-semibold text-sm flex items-center gap-2 mb-4">
          <Trophy className="h-4 w-4 text-amber-500" />
          Top contributeurs
        </h3>
        <div className="space-y-3">
          {entries.map((entry, idx) => (
            <div key={entry.user_id} className="flex items-center gap-3">
              <span className={`text-xs font-bold w-5 text-center ${idx === 0 ? "text-amber-500" : idx === 1 ? "text-gray-400" : idx === 2 ? "text-amber-700" : "text-muted-foreground"}`}>
                {idx + 1}
              </span>
              <div className="h-7 w-7 rounded-full bg-brand/10 flex items-center justify-center text-brand text-xs font-bold shrink-0">
                {entry.full_name?.charAt(0)?.toUpperCase() || "?"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{entry.full_name || "Anonyme"}</p>
              </div>
              <ReputationBadge score={entry.score} showScore />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
