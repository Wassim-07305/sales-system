"use client";

import { useState, useCallback } from "react";
import {
  MoreHorizontal,
  Reply,
  Pencil,
  Trash2,
  Pin,
  SmilePlus,
  Smile,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMessageTime } from "@/lib/messaging-utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MessageContent } from "./message-content";
import { MessageReactions } from "./message-reactions";
import { QuickReactionPicker } from "./emoji-picker";
import { EmojiPicker } from "./emoji-picker";
import type { EnrichedMessage } from "@/lib/types/messaging";

const STAFF_ROLES = ["admin", "manager"];

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

interface MessageBubbleProps {
  message: EnrichedMessage;
  isOwn: boolean;
  showSender: boolean;
  currentUserId: string;
  onReply: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onTogglePin: () => void;
  onToggleReaction: (emoji: string) => void;
}

export function MessageBubble({
  message,
  isOwn,
  showSender,
  currentUserId,
  onReply,
  onEdit,
  onDelete,
  onTogglePin,
  onToggleReaction,
}: MessageBubbleProps) {
  const [showQuickReact, setShowQuickReact] = useState(false);
  const [showActions, setShowActions] = useState(false);

  const isStaff = message.sender
    ? STAFF_ROLES.includes(message.sender.role)
    : false;

  const handleQuickReact = useCallback(
    (emoji: string) => {
      onToggleReaction(emoji);
      setShowQuickReact(false);
    },
    [onToggleReaction],
  );

  const handleFullPickerSelect = useCallback(
    (emoji: string) => {
      onToggleReaction(emoji);
    },
    [onToggleReaction],
  );

  // System messages
  if (message.content_type === "system") {
    return (
      <div className="flex justify-center py-1">
        <span className="text-xs italic text-muted-foreground">
          {message.content}
        </span>
      </div>
    );
  }

  // Hover/focus actions toolbar (shared between own and other)
  const actionsToolbar = (
    <div
      className={cn(
        "absolute -top-3 flex items-center gap-0.5 rounded-lg border bg-background px-1 py-0.5 shadow-sm",
        "opacity-0 transition-opacity z-10",
        (showActions || showQuickReact) ? "opacity-100" : "group-hover:opacity-100 group-focus-within:opacity-100",
        isOwn ? "left-2 right-auto" : "right-2 left-auto",
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => { setShowActions(false); setShowQuickReact(false); }}
    >
      {/* Quick react + full picker unified */}
      <div className="relative">
        <button
          onClick={() => setShowQuickReact(!showQuickReact)}
          className="rounded p-1 hover:bg-muted transition-colors"
          title="Réagir"
          aria-label="Réagir avec un emoji"
          aria-expanded={showQuickReact}
        >
          <SmilePlus className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
        {showQuickReact && (
          <div
            className={cn(
              "absolute bottom-full mb-1 z-20",
              isOwn ? "left-0" : "right-0",
            )}
          >
            <QuickReactionPicker
              onSelect={handleQuickReact}
              onOpenFull={() => setShowQuickReact(false)}
            />
          </div>
        )}
      </div>

      {/* Full emoji picker (accessible via "+" in quick picker or directly) */}
      <EmojiPicker
        onSelect={handleFullPickerSelect}
        side="top"
        align={isOwn ? "start" : "end"}
        trigger={
          <button
            className="rounded p-1 hover:bg-muted transition-colors"
            title="Plus d'emojis"
            aria-label="Choisir un emoji"
          >
            <Smile className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        }
      />

      <button
        onClick={onReply}
        className="rounded p-1 hover:bg-muted transition-colors"
        title="Répondre"
        aria-label="Répondre"
      >
        <Reply className="h-3.5 w-3.5 text-muted-foreground" />
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="rounded p-1 hover:bg-muted transition-colors" aria-label="Plus d'options">
            <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align={isOwn ? "start" : "end"} className="w-44">
          <DropdownMenuItem onClick={onReply}>
            <Reply className="mr-2 h-4 w-4" />
            Répondre
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onTogglePin}>
            <Pin className="mr-2 h-4 w-4" />
            {message.is_pinned ? "Désépingler" : "Épingler"}
          </DropdownMenuItem>
          {isOwn && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="mr-2 h-4 w-4" />
                Modifier
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onDelete}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Supprimer
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  // Bubble content (shared between own and other)
  const bubbleContent = (
    <div
      className={cn(
        "px-3.5 py-2 relative",
        isOwn
          ? "bg-gradient-to-br from-primary/[0.08] to-primary/[0.03] rounded-2xl rounded-tr-sm"
          : "bg-muted/40 rounded-2xl rounded-tl-sm",
      )}
    >
      {/* Sender info */}
      {showSender && !isOwn && (
        <div className="flex items-baseline gap-2 mb-0.5">
          <span
            className={cn(
              "text-sm font-semibold",
              isStaff ? "text-primary" : "text-foreground",
            )}
          >
            {message.sender?.full_name ?? "Inconnu"}
          </span>
          {message.sender?.role && (
            <span className="text-[10px] text-muted-foreground capitalize">
              {message.sender.role.replace("_", " ")}
            </span>
          )}
          <span className="text-[10px] text-muted-foreground">
            {formatMessageTime(message.created_at)}
          </span>
        </div>
      )}

      {/* Own message: show time on sender line */}
      {showSender && isOwn && (
        <div className="flex items-baseline gap-2 mb-0.5 justify-end">
          <span className="text-[10px] text-muted-foreground">
            {formatMessageTime(message.created_at)}
          </span>
        </div>
      )}

      {/* Urgent + pinned badges */}
      {(message.is_urgent || message.is_pinned) && (
        <div className="flex items-center gap-2 mb-1">
          {message.is_urgent && (
            <span className="flex items-center gap-0.5 text-[10px] text-destructive font-medium">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-destructive" />
              </span>
              Urgent
            </span>
          )}
          {message.is_pinned && (
            <Pin className="h-3 w-3 text-primary fill-primary" />
          )}
        </div>
      )}

      {/* Reply reference */}
      {message.reply_message && (
        <div className="mb-1.5 flex items-center gap-2 rounded-lg border-l-2 border-primary/50 bg-background/50 px-3 py-1.5">
          <Reply className="h-3 w-3 text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <span className="text-xs font-medium text-primary">
              {message.reply_message.sender?.full_name ?? "Inconnu"}
            </span>
            <p className="truncate text-xs text-muted-foreground">
              {message.reply_message.content}
            </p>
          </div>
        </div>
      )}

      <MessageContent message={message} />

      {/* Edited indicator */}
      {message.is_edited && (
        <span className="text-[10px] text-muted-foreground italic ml-1">
          (modifié)
        </span>
      )}

      <MessageReactions
        reactions={message.reactions}
        currentUserId={currentUserId}
        onToggleReaction={onToggleReaction}
      />
    </div>
  );

  const handleContainerLeave = useCallback(() => {
    setShowQuickReact(false);
    setShowActions(false);
  }, []);

  // Own message: aligned right, no avatar
  if (isOwn) {
    return (
      <div
        className={cn(
          "group relative flex gap-2.5 px-4 pt-1 pb-0.5 justify-end transition-colors",
          message.is_urgent && "border-l-2 border-destructive",
        )}
        onMouseLeave={handleContainerLeave}
      >
        {actionsToolbar}
        <div className="max-w-[90%] md:max-w-[70%]">{bubbleContent}</div>
      </div>
    );
  }

  // Other message: aligned left, with avatar
  return (
    <div
      className={cn(
        "group relative flex gap-2.5 px-4 pt-1 pb-0.5 transition-colors",
        message.is_urgent && "border-l-2 border-destructive",
      )}
      onMouseLeave={handleContainerLeave}
    >
      {showSender ? (
        <Avatar className="h-9 w-9 shrink-0 mt-0.5">
          <AvatarImage src={message.sender?.avatar_url ?? undefined} />
          <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
            {message.sender?.full_name
              ? getInitials(message.sender.full_name)
              : "?"}
          </AvatarFallback>
        </Avatar>
      ) : (
        <div className="w-9 shrink-0" />
      )}

      <div className="max-w-[90%] md:max-w-[70%] relative">
        {actionsToolbar}
        {bubbleContent}
      </div>
    </div>
  );
}
