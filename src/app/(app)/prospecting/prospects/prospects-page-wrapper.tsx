"use client";

import { useState } from "react";
import { Users, Linkedin, Instagram } from "lucide-react";
import { UnifiedTabs, type UnifiedTab } from "@/components/ui/unified-tabs";
import { ProspectsView } from "./prospects-view";
import { LinkedinView } from "../linkedin/linkedin-view";
import { InstagramView } from "../instagram/instagram-view";
import type {
  LinkedInFeed,
  FeedPost,
  Recommendation,
  CommentHistory,
} from "@/lib/actions/linkedin-engage";

const TABS: UnifiedTab[] = [
  { label: "Mes prospects", value: "base", icon: Users },
  { label: "Recherche LinkedIn", value: "linkedin", icon: Linkedin },
  { label: "Recherche Instagram", value: "instagram", icon: Instagram },
];

interface Props {
  // Base prospects props
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prospects: any[];
  lists: { id: string; name: string }[];
  segmentStats: { total: number; hot: number; warm: number; cold: number; avgScore: number };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  quota: any;
  // LinkedIn props
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  linkedinProspects: any[];
  unipileLinkedin?: { connected: boolean; accountName?: string } | null;
  initialFeeds: LinkedInFeed[];
  initialPosts: FeedPost[];
  recommendations: Recommendation[];
  interactionComments: CommentHistory[];
  // Instagram props
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  instagramProspects: any[];
  unipileInstagram?: { connected: boolean; accountName?: string } | null;
}

export function ProspectsPageWrapper({
  prospects,
  lists,
  segmentStats,
  quota,
  linkedinProspects,
  unipileLinkedin,
  initialFeeds,
  initialPosts,
  recommendations,
  interactionComments,
  instagramProspects,
  unipileInstagram,
}: Props) {
  const [activeTab, setActiveTab] = useState("base");

  return (
    <div className="space-y-5">
      <UnifiedTabs tabs={TABS} active={activeTab} onTabChange={setActiveTab} />

      <div>
        {activeTab === "base" && (
          <ProspectsView
            prospects={prospects}
            lists={lists}
            segmentStats={segmentStats}
            quota={quota}
          />
        )}
        {activeTab === "linkedin" && (
          <LinkedinView
            prospects={linkedinProspects}
            unipileLinkedin={unipileLinkedin}
            initialFeeds={initialFeeds}
            initialPosts={initialPosts}
            recommendations={recommendations}
            interactionComments={interactionComments}
          />
        )}
        {activeTab === "instagram" && (
          <InstagramView
            prospects={instagramProspects}
            unipileInstagram={unipileInstagram}
          />
        )}
      </div>
    </div>
  );
}
