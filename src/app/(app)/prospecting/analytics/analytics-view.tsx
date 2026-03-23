"use client";

import { useState } from "react";
import { BarChart3, Palette } from "lucide-react";
import { UnifiedTabs, type UnifiedTab } from "@/components/ui/unified-tabs";
import { StatsView } from "../linkhub/stats/stats-view";
import { MonStyleView } from "../linkhub/mon-style/mon-style-view";
import type {
  EngageStats,
  CommentHistory,
  StyleSample,
} from "@/lib/actions/linkedin-engage";

const TABS: UnifiedTab[] = [
  { label: "Statistiques", value: "stats", icon: BarChart3 },
  { label: "Mon Style", value: "style", icon: Palette },
];

interface Props {
  stats: EngageStats;
  topComments: CommentHistory[];
  topCreators: Array<{
    name: string;
    commentsCount: number;
    totalImpressions: number;
  }>;
  hourlyStats: Array<{ hour: number; count: number; impressions: number }>;
  styleSamples: StyleSample[];
}

export function AnalyticsView({
  stats,
  topComments,
  topCreators,
  hourlyStats,
  styleSamples,
}: Props) {
  const [activeTab, setActiveTab] = useState("stats");

  return (
    <div className="space-y-5">
      <UnifiedTabs tabs={TABS} active={activeTab} onTabChange={setActiveTab} />

      <div>
        {activeTab === "stats" && (
          <StatsView
            stats={stats}
            topComments={topComments}
            topCreators={topCreators}
            hourlyStats={hourlyStats}
          />
        )}
        {activeTab === "style" && (
          <MonStyleView initialSamples={styleSamples} />
        )}
      </div>
    </div>
  );
}
