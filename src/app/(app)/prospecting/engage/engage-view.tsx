"use client";

import { useState } from "react";
import { Rss, MessageSquare, Sparkles, Timer } from "lucide-react";
import { UnifiedTabs, type UnifiedTab } from "@/components/ui/unified-tabs";
import { FeedsView } from "../linkhub/feeds/feeds-view";
import { RepliesView } from "../linkhub/replies/replies-view";
import { RecommandationsView } from "../linkhub/recommandations/recommandations-view";
import { SessionView } from "../linkhub/session/session-view";
import type {
  LinkedInFeed,
  FeedPost,
  CommentHistory,
  EngageStats,
  StyleSample,
  Recommendation,
} from "@/lib/actions/linkedin-engage";

const TABS: UnifiedTab[] = [
  { label: "Feeds", value: "feeds", icon: Rss },
  { label: "Commentaires", value: "replies", icon: MessageSquare },
  { label: "Recommandations", value: "recommendations", icon: Sparkles },
  { label: "Session", value: "session", icon: Timer },
];

interface Props {
  initialFeeds: LinkedInFeed[];
  initialPosts: FeedPost[];
  recommendations: Recommendation[];
  comments: CommentHistory[];
  stats: EngageStats;
  styleSamples: StyleSample[];
}

export function EngageView({
  initialFeeds,
  initialPosts,
  recommendations,
  comments,
  stats,
  styleSamples,
}: Props) {
  const [activeTab, setActiveTab] = useState("feeds");

  return (
    <div className="space-y-5">
      {/* Stats summary */}
      <div className="flex items-center gap-6 text-sm">
        <div>
          <span className="font-semibold">{stats.commentsThisMonth}</span>
          <span className="text-muted-foreground ml-1">commentaires ce mois</span>
        </div>
        <div>
          <span className="font-semibold">{stats.profilesEngagedToday}</span>
          <span className="text-muted-foreground ml-1">profils engagés aujourd&apos;hui</span>
        </div>
        {stats.bestHour !== undefined && stats.bestHour !== null && (
          <div>
            <span className="font-semibold">{stats.bestHour}h</span>
            <span className="text-muted-foreground ml-1">meilleure heure</span>
          </div>
        )}
      </div>

      <UnifiedTabs tabs={TABS} active={activeTab} onTabChange={setActiveTab} />

      <div>
        {activeTab === "feeds" && (
          <FeedsView initialFeeds={initialFeeds} initialPosts={initialPosts} />
        )}
        {activeTab === "replies" && <RepliesView comments={comments} />}
        {activeTab === "recommendations" && (
          <RecommandationsView initialRecommendations={recommendations} />
        )}
        {activeTab === "session" && (
          <SessionView feeds={initialFeeds} posts={initialPosts} />
        )}
      </div>
    </div>
  );
}
