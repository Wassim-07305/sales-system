"use client";

import { StatsView } from "./stats-view";
import { MonStyleView } from "../mon-style/mon-style-view";
import type {
  EngageStats,
  CommentHistory,
  StyleSample,
} from "@/lib/actions/linkedin-engage";

interface Props {
  stats: EngageStats;
  topComments: CommentHistory[];
  topCreators: Array<{
    name: string;
    commentsCount: number;
    totalImpressions: number;
  }>;
  hourlyStats: Array<{ hour: number; count: number; impressions: number }>;
  initialSamples: StyleSample[];
}

export function StatsAndStyleView({
  stats,
  topComments,
  topCreators,
  hourlyStats,
  initialSamples,
}: Props) {
  return (
    <div className="space-y-8">
      <StatsView
        stats={stats}
        topComments={topComments}
        topCreators={topCreators}
        hourlyStats={hourlyStats}
      />
      <div className="border-t border-border/30 pt-6">
        <MonStyleView initialSamples={initialSamples} />
      </div>
    </div>
  );
}
