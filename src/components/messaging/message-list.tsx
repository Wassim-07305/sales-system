"use client";

import React, { useEffect, useRef, useMemo } from "react";
import { Loader2 } from "lucide-react";
import { groupMessages, isSameDay } from "@/lib/messaging-utils";
import { useMessagingStore } from "@/stores/messaging-store";
import { DateSeparator } from "./date-separator";
import { MessageBubble } from "./message-bubble";
import type { EnrichedMessage } from "@/lib/types/messaging";

/** Error boundary for individual messages — logs offending data */
class MsgBoundary extends React.Component<
  { msgId: string; msgData: unknown; children: React.ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error) {
    // Log the raw message data to console so we can see what field is an object
    console.error(`[MsgBoundary] Message ${this.props.msgId} crashed:`, error.message);
    console.error(`[MsgBoundary] Raw data:`, JSON.stringify(this.props.msgData, null, 2));
  }
  render() {
    if (this.state.error) {
      return (
        <div className="p-2 text-xs text-destructive bg-destructive/10 rounded m-1">
          <strong>Message crash: {this.props.msgId}</strong>
          <br />{this.state.error.message}
          <pre className="mt-1 text-[9px] max-h-32 overflow-auto whitespace-pre-wrap">
            {JSON.stringify(this.props.msgData, null, 2)}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

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

  // IMPORTANT: All hooks MUST be called before any conditional returns (Rules of Hooks)
  const filteredMessages = useMemo(
    () =>
      searchQuery
        ? messages.filter((m) =>
            (m.content ?? "").toLowerCase().includes(searchQuery.toLowerCase()),
          )
        : messages,
    [messages, searchQuery],
  );

  const groups = useMemo(() => groupMessages(filteredMessages), [filteredMessages]);

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

  let lastDate: string | null = null;

  return (
    <section ref={containerRef} className="flex-1 overflow-y-auto" role="log" aria-label="Messages" aria-live="polite">
      <div className="py-4">
        {groups.map((group, groupIdx) => {
          const firstMsg = group.messages[0];
          const showDateSep =
            !lastDate || !isSameDay(lastDate, firstMsg.created_at);
          if (showDateSep) {
            lastDate = firstMsg.created_at;
          }

          return (
            <div
              key={`${group.senderId}-${groupIdx}`}
              className="animate-fade-in"
            >
              {showDateSep && <DateSeparator date={firstMsg.created_at} />}
              {group.messages.map((msg, msgIdx) => (
                <MsgBoundary key={msg.id} msgId={msg.id} msgData={msg}>
                <MessageBubble
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
                </MsgBoundary>
              ))}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
    </section>
  );
}
