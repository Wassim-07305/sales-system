"use client";

import { useState } from "react";
import { Newspaper, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { FeedsView } from "./feeds/feeds-view";
import { LinkedinView } from "../linkedin/linkedin-view";
import type { LinkedInFeed, FeedPost } from "@/lib/actions/linkedin-engage";

type Mode = "prospects" | "feeds";

interface Prospect {
  id: string;
  name: string;
  profile_url: string | null;
  platform: string;
  status: string;
  created_at: string;
  updated_at?: string;
  list: { id: string; name: string } | null;
}

interface Props {
  initialFeeds: LinkedInFeed[];
  initialPosts: FeedPost[];
  prospects: Prospect[];
  unipileLinkedin?: { connected: boolean; accountName?: string } | null;
}

export function LinkedInHubView({
  initialFeeds,
  initialPosts,
  prospects,
  unipileLinkedin,
}: Props) {
  const [mode, setMode] = useState<Mode>("prospects");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1 bg-muted/30 rounded-lg p-1 w-fit">
        <button
          onClick={() => setMode("prospects")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
            mode === "prospects"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Users className="h-3.5 w-3.5" />
          Prospects
        </button>
        <button
          onClick={() => setMode("feeds")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
            mode === "feeds"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Newspaper className="h-3.5 w-3.5" />
          Feeds
        </button>
      </div>

      {mode === "prospects" ? (
        <LinkedinView
          prospects={prospects}
          unipileLinkedin={unipileLinkedin}
        />
      ) : (
        <FeedsView initialFeeds={initialFeeds} initialPosts={initialPosts} />
      )}
    </div>
  );
}
