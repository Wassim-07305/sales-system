"use client";

import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { groupMessages, isSameDay } from "@/lib/messaging-utils";
import { useMessagingStore } from "@/stores/messaging-store";
import { DateSeparator } from "./date-separator";
import { MessageBubble } from "./message-bubble";
import type { EnrichedMessage } from "@/lib/types/messaging";

interface MessageListProps {
  messages: EnrichedMessage[];
  isLoading: boolean;
  currentUserId: string;
  onReply: (msg: EnrichedMessage) => void;
  onEdit: (messageId: string) => void;
  onDelete: (messageId: string) => void;
  onTogglePin: (messageId: string, pinned: boolean) => void;
  onToggleReaction: (messageId: string, emoji: string) => void;
}

export function MessageList({
  messages,
  isLoading,
  currentUserId,
  onReply,
  onEdit,
  onDelete,
  onTogglePin,
  onToggleReaction,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { searchQuery } = useMessagingStore();

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Aucun message pour le moment
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Envoyez le premier message !
          </p>
        </div>
      </div>
    );
  }

  // Filter by search
  const filteredMessages = searchQuery
    ? messages.filter((m) =>
        m.content.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : messages;

  const groups = groupMessages(filteredMessages);

  let lastDate: string | null = null;

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto">
      <div className="py-4">
        {groups.map((group, groupIdx) => {
          const firstMsg = group.messages[0];
          const showDateSep =
            !lastDate || !isSameDay(lastDate, firstMsg.created_at);
          if (showDateSep) {
            lastDate = firstMsg.created_at;
          }

          return (
            <div key={`${group.senderId}-${groupIdx}`}>
              {showDateSep && <DateSeparator date={firstMsg.created_at} />}
              {group.messages.map((msg, msgIdx) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  isOwn={msg.sender_id === currentUserId}
                  showSender={msgIdx === 0}
                  currentUserId={currentUserId}
                  onReply={() => onReply(msg)}
                  onEdit={() => onEdit(msg.id)}
                  onDelete={() => onDelete(msg.id)}
                  onTogglePin={() => onTogglePin(msg.id, msg.is_pinned)}
                  onToggleReaction={(emoji) => onToggleReaction(msg.id, emoji)}
                />
              ))}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
