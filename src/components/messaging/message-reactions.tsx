"use client";

import { cn } from "@/lib/utils";
import type { MessageReaction } from "@/lib/types/messaging";

interface MessageReactionsProps {
  reactions: MessageReaction[];
  currentUserId: string;
  onToggleReaction: (emoji: string) => void;
}

interface GroupedReaction {
  emoji: string;
  count: number;
  userIds: string[];
  hasReacted: boolean;
}

export function MessageReactions({
  reactions,
  currentUserId,
  onToggleReaction,
}: MessageReactionsProps) {
  if (reactions.length === 0) return null;

  const grouped = reactions.reduce<Record<string, GroupedReaction>>(
    (acc, r) => {
      if (!acc[r.emoji]) {
        acc[r.emoji] = {
          emoji: r.emoji,
          count: 0,
          userIds: [],
          hasReacted: false,
        };
      }
      acc[r.emoji].count++;
      acc[r.emoji].userIds.push(r.user_id);
      if (r.user_id === currentUserId) {
        acc[r.emoji].hasReacted = true;
      }
      return acc;
    },
    {},
  );

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {Object.values(grouped).map((group) => (
        <button
          key={group.emoji}
          onClick={() => onToggleReaction(group.emoji)}
          aria-label={`${group.hasReacted ? "Retirer" : "Ajouter"} la réaction ${group.emoji} (${group.count})`}
          aria-pressed={group.hasReacted}
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs transition-colors",
            "border hover:bg-muted",
            group.hasReacted
              ? "border-primary/40 bg-primary/10 text-primary"
              : "border-border bg-background text-muted-foreground",
          )}
        >
          <span>{group.emoji}</span>
          <span>{group.count}</span>
        </button>
      ))}
    </div>
  );
}
