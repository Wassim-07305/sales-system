"use client";

import { useState, useRef, useCallback, type KeyboardEvent } from "react";
import {
  Send,
  Paperclip,
  Smile,
  X,
  Reply,
  AlertTriangle,
  Clock,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const EMOJI_LIST = [
  "\u{1F44D}",
  "\u{1F44E}",
  "\u{2764}\u{FE0F}",
  "\u{1F602}",
  "\u{1F622}",
  "\u{1F389}",
  "\u{1F525}",
  "\u{1F4AF}",
  "\u{2705}",
  "\u{274C}",
  "\u{1F64F}",
  "\u{1F44B}",
  "\u{1F914}",
  "\u{1F440}",
  "\u{1F680}",
  "\u{2B50}",
  "\u{1F381}",
  "\u{1F3C6}",
  "\u{1F4AA}",
  "\u{1F64C}",
  "\u{1F60D}",
  "\u{1F609}",
  "\u{1F60E}",
  "\u{1F92D}",
];

interface ChatInputProps {
  onSend: (params: {
    content: string;
    contentType?: string;
    replyTo?: string;
    isUrgent?: boolean;
    scheduledAt?: string;
  }) => void;
  onUploadFile: (file: File) => void;
  isSending: boolean;
  replyTo: { id: string; content: string; senderName: string } | null;
  onCancelReply: () => void;
  editingMessageId: string | null;
  editingContent: string;
  onSaveEdit: (content: string) => void;
  onCancelEdit: () => void;
  onTyping: () => void;
  disabled?: boolean;
}

export function ChatInput({
  onSend,
  onUploadFile,
  isSending,
  replyTo,
  onCancelReply,
  editingMessageId,
  editingContent,
  onSaveEdit,
  onCancelEdit,
  onTyping,
  disabled = false,
}: ChatInputProps) {
  const [content, setContent] = useState("");
  const [isUrgent, setIsUrgent] = useState(false);
  const [scheduledAt, setScheduledAt] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Use edit content when editing
  const displayContent = editingMessageId ? editingContent : content;

  const handleSend = useCallback(() => {
    const text = displayContent.trim();
    if (!text) return;

    if (editingMessageId) {
      onSaveEdit(text);
      return;
    }

    onSend({
      content: text,
      contentType: "text",
      replyTo: replyTo?.id,
      isUrgent,
      scheduledAt: scheduledAt ?? undefined,
    });

    setContent("");
    setIsUrgent(false);
    setScheduledAt(null);

    // Re-focus textarea
    setTimeout(() => textareaRef.current?.focus(), 0);
  }, [
    displayContent,
    editingMessageId,
    onSend,
    onSaveEdit,
    replyTo,
    isUrgent,
    scheduledAt,
  ]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (value: string) => {
    if (editingMessageId) {
      // When editing, parent manages content via editingContent prop
      // We need a callback for this — for simplicity, treat as local
    }
    setContent(value);
    onTyping();
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadFile(file);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const insertEmoji = (emoji: string) => {
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newContent =
        displayContent.slice(0, start) + emoji + displayContent.slice(end);
      setContent(newContent);
      // Move cursor after emoji
      setTimeout(() => {
        textarea.selectionStart = start + emoji.length;
        textarea.selectionEnd = start + emoji.length;
        textarea.focus();
      }, 0);
    } else {
      setContent(displayContent + emoji);
    }
  };

  // Auto-resize textarea
  const autoResize = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  };

  return (
    <div className="border-t bg-background">
      {/* Reply preview */}
      {replyTo && (
        <div className="flex items-center gap-2 border-b px-4 py-2 bg-muted/30">
          <Reply className="h-4 w-4 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-xs font-medium text-primary">
              {replyTo.senderName}
            </span>
            <p className="truncate text-xs text-muted-foreground">
              {replyTo.content}
            </p>
          </div>
          <button
            onClick={onCancelReply}
            className="rounded p-1 hover:bg-muted transition-colors"
          >
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>
      )}

      {/* Edit indicator */}
      {editingMessageId && (
        <div className="flex items-center gap-2 border-b px-4 py-2 bg-primary/5">
          <span className="text-xs font-medium text-primary">
            Modification en cours
          </span>
          <button
            onClick={onCancelEdit}
            className="ml-auto rounded p-1 hover:bg-muted transition-colors"
          >
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>
      )}

      {/* Input area */}
      <div className="flex items-end gap-2 px-4 py-3">
        {/* File attach */}
        <button
          onClick={handleFileSelect}
          disabled={disabled}
          className="rounded-lg p-2 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground disabled:opacity-50"
          title="Joindre un fichier"
        >
          <Paperclip className="h-5 w-5" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileChange}
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar"
        />

        {/* Textarea */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={displayContent}
            onChange={(e) => {
              handleChange(e.target.value);
              autoResize(e.target);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Ecrivez un message..."
            disabled={disabled}
            rows={1}
            className={cn(
              "w-full resize-none rounded-xl border bg-muted/30 px-4 py-2.5 text-sm",
              "placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "max-h-40 scrollbar-thin",
              isUrgent && "border-destructive/40 bg-destructive/5",
            )}
          />
        </div>

        {/* Emoji picker */}
        <Popover>
          <PopoverTrigger asChild>
            <button
              disabled={disabled}
              className="rounded-lg p-2 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground disabled:opacity-50"
              title="Emoji"
            >
              <Smile className="h-5 w-5" />
            </button>
          </PopoverTrigger>
          <PopoverContent side="top" align="end" className="w-64 p-2">
            <div className="grid grid-cols-6 gap-1">
              {EMOJI_LIST.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => insertEmoji(emoji)}
                  className="rounded p-1.5 text-lg hover:bg-muted transition-colors"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Urgent toggle */}
        {!editingMessageId && (
          <button
            onClick={() => setIsUrgent(!isUrgent)}
            disabled={disabled}
            className={cn(
              "rounded-lg p-2 transition-colors disabled:opacity-50",
              isUrgent
                ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
                : "hover:bg-muted text-muted-foreground hover:text-foreground",
            )}
            title={isUrgent ? "Retirer urgent" : "Marquer urgent"}
          >
            <AlertTriangle className="h-5 w-5" />
          </button>
        )}

        {/* Schedule toggle */}
        {!editingMessageId && (
          <Popover>
            <PopoverTrigger asChild>
              <button
                disabled={disabled}
                className={cn(
                  "rounded-lg p-2 transition-colors disabled:opacity-50",
                  scheduledAt
                    ? "bg-primary/10 text-primary hover:bg-primary/20"
                    : "hover:bg-muted text-muted-foreground hover:text-foreground",
                )}
                title="Planifier"
              >
                <Clock className="h-5 w-5" />
              </button>
            </PopoverTrigger>
            <PopoverContent side="top" align="end" className="w-64 p-3">
              <p className="text-xs font-medium mb-2">Planifier l&apos;envoi</p>
              <input
                type="datetime-local"
                value={scheduledAt ?? ""}
                onChange={(e) => setScheduledAt(e.target.value || null)}
                className="w-full rounded-lg border bg-background px-3 py-1.5 text-sm"
                min={new Date().toISOString().slice(0, 16)}
              />
              {scheduledAt && (
                <button
                  onClick={() => setScheduledAt(null)}
                  className="mt-2 text-xs text-destructive hover:underline"
                >
                  Annuler la planification
                </button>
              )}
            </PopoverContent>
          </Popover>
        )}

        {/* Send button */}
        <Button
          onClick={handleSend}
          disabled={disabled || isSending || !displayContent.trim()}
          size="icon"
          className="h-10 w-10 rounded-xl shrink-0"
        >
          {isSending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
