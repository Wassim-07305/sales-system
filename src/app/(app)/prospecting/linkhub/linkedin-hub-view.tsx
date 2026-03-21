"use client";

import { useState } from "react";
import { Newspaper, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { FeedsView } from "./feeds/feeds-view";
import { SessionView } from "./session/session-view";
import type { LinkedInFeed, FeedPost } from "@/lib/actions/linkedin-engage";

type Mode = "feeds" | "session";

interface Props {
  initialFeeds: LinkedInFeed[];
  initialPosts: FeedPost[];
}

export function LinkedInHubView({ initialFeeds, initialPosts }: Props) {
  const [mode, setMode] = useState<Mode>("feeds");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1 bg-muted/30 rounded-lg p-1 w-fit">
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
        <button
          onClick={() => setMode("session")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
            mode === "session"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Play className="h-3.5 w-3.5" />
          Session
        </button>
      </div>

      {mode === "feeds" ? (
        <FeedsView initialFeeds={initialFeeds} initialPosts={initialPosts} />
      ) : (
        <SessionView feeds={initialFeeds} posts={initialPosts} />
      )}
    </div>
  );
}
