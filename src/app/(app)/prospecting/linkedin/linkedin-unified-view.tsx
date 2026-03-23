"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Rss,
  MessageSquare,
  Sparkles,
  Palette,
  BarChart3,
  Timer,
} from "lucide-react";
import { LinkedinView } from "./linkedin-view";
import { FeedsView } from "../linkhub/feeds/feeds-view";
import { RepliesView } from "../linkhub/replies/replies-view";
import { RecommandationsView } from "../linkhub/recommandations/recommandations-view";
import { MonStyleView } from "../linkhub/mon-style/mon-style-view";
import { StatsView } from "../linkhub/stats/stats-view";
import { SessionView } from "../linkhub/session/session-view";
import type {
  LinkedInFeed,
  FeedPost,
  CommentHistory,
  EngageStats,
  StyleSample,
  Recommendation,
} from "@/lib/actions/linkedin-engage";

interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prospects: any[];
  unipileLinkedin?: { connected: boolean; accountName?: string } | null;
  initialFeeds: LinkedInFeed[];
  initialPosts: FeedPost[];
  recommendations: Recommendation[];
  interactionComments: CommentHistory[];
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

const SECTION_ICONS: Record<string, React.ReactNode> = {
  feeds: <Rss className="h-4 w-4" />,
  replies: <MessageSquare className="h-4 w-4" />,
  recommandations: <Sparkles className="h-4 w-4" />,
  "mon-style": <Palette className="h-4 w-4" />,
  stats: <BarChart3 className="h-4 w-4" />,
  session: <Timer className="h-4 w-4" />,
};

export function LinkedinUnifiedView({
  prospects,
  unipileLinkedin,
  initialFeeds,
  initialPosts,
  recommendations,
  interactionComments,
  stats,
  topComments,
  topCreators,
  hourlyStats,
  styleSamples,
}: Props) {
  return (
    <div className="space-y-6">
      {/* Main LinkedIn section — always visible (search, prospects, tools) */}
      <LinkedinView
        prospects={prospects}
        unipileLinkedin={unipileLinkedin}
        initialFeeds={initialFeeds}
        initialPosts={initialPosts}
        recommendations={recommendations}
        interactionComments={interactionComments}
      />

      {/* Additional sections as collapsible accordion */}
      <Accordion
        type="multiple"
        defaultValue={["feeds"]}
        className="space-y-2"
      >
        <AccordionItem value="feeds" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              {SECTION_ICONS.feeds}
              <span>Feeds LinkedIn</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <FeedsView
              initialFeeds={initialFeeds}
              initialPosts={initialPosts}
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="replies" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              {SECTION_ICONS.replies}
              <span>Réponses</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <RepliesView comments={interactionComments} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="recommandations" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              {SECTION_ICONS.recommandations}
              <span>Recommandations</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <RecommandationsView initialRecommendations={recommendations} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="mon-style" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              {SECTION_ICONS["mon-style"]}
              <span>Mon Style</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <MonStyleView initialSamples={styleSamples} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="stats" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              {SECTION_ICONS.stats}
              <span>Statistiques</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <StatsView
              stats={stats}
              topComments={topComments}
              topCreators={topCreators}
              hourlyStats={hourlyStats}
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="session" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              {SECTION_ICONS.session}
              <span>Session d&apos;engagement</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <SessionView feeds={initialFeeds} posts={initialPosts} />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
