"use client";

import { useState } from "react";
import { Sparkles, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { RecommandationsView } from "../recommandations/recommandations-view";
import { RepliesView } from "../replies/replies-view";
import type { Recommendation } from "@/lib/actions/linkedin-engage";
import type { CommentHistory } from "@/lib/actions/linkedin-engage";

type Tab = "recommandations" | "reponses";

interface Props {
  recommendations: Recommendation[];
  comments: CommentHistory[];
}

export function InteractionsView({ recommendations, comments }: Props) {
  const [tab, setTab] = useState<Tab>("recommandations");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1 bg-muted/30 rounded-lg p-1 w-fit">
        <button
          onClick={() => setTab("recommandations")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
            tab === "recommandations"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Sparkles className="h-3.5 w-3.5" />
          Recommandations
        </button>
        <button
          onClick={() => setTab("reponses")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
            tab === "reponses"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <MessageCircle className="h-3.5 w-3.5" />
          Réponses
          {comments.length > 0 && (
            <span className="text-[10px] bg-emerald-500/10 text-emerald-500 px-1.5 py-0.5 rounded-full">
              {comments.length}
            </span>
          )}
        </button>
      </div>

      {tab === "recommandations" ? (
        <RecommandationsView initialRecommendations={recommendations} />
      ) : (
        <RepliesView comments={comments} />
      )}
    </div>
  );
}
