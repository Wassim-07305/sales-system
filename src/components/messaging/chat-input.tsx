"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type KeyboardEvent,
} from "react";
import {
  Send,
  Paperclip,
  Smile,
  X,
  Reply,
  AlertTriangle,
  Clock,
  Loader2,
  Mic,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { VoiceRecorder, VoicePreview } from "./voice-recorder";

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

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

interface ChatInputProps {
  onSend: (params: {
    content: string;
    contentType?: string;
    replyTo?: string;
    isUrgent?: boolean;
    scheduledAt?: string;
  }) => void;
  onUploadFile: (file: File) => void;
  onVoiceSend: (blob: Blob, duration: number) => void;
  isSending: boolean;
  replyTo: { id: string; content: string; senderName: string } | null;
  onCancelReply: () => void;
  editingMessageId: string | null;
  editingContent: string;
  onSaveEdit: (content: string) => void;
  onCancelEdit: () => void;
  onTyping: () => void;
  disabled?: boolean;
  channelName?: string;
  droppedFile?: File | null;
  onClearDroppedFile?: () => void;
}

export function ChatInput({
  onSend,
  onUploadFile,
  onVoiceSend,
  isSending,
  replyTo,
  onCancelReply,
  editingMessageId,
  editingContent,
  onSaveEdit,
  onCancelEdit,
  onTyping,
  disabled = false,
  channelName,
  droppedFile,
  onClearDroppedFile,
}: ChatInputProps) {
  const [content, setContent] = useState("");
  const [editContent, setEditContent] = useState("");
  const [isUrgent, setIsUrgent] = useState(false);
  const [scheduledAt, setScheduledAt] = useState<string | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [pendingVoices, setPendingVoices] = useState<
    Array<{ blob: Blob; duration: number; levels: number[] }>
  >([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* eslint-disable react-hooks/set-state-in-effect */
  // Sync edit content when editing starts or editingContent changes
  useEffect(() => {
    if (editingMessageId) {
      setEditContent(editingContent);
    }
  }, [editingMessageId, editingContent]);

  // Handle dropped file from parent
  useEffect(() => {
    if (droppedFile) {
      setPendingFiles((prev) => [...prev, droppedFile]);
      onClearDroppedFile?.();
    }
  }, [droppedFile, onClearDroppedFile]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Pick the right state based on mode
  const displayContent = editingMessageId ? editContent : content;

  const hasContent =
    displayContent.trim().length > 0 ||
    pendingFiles.length > 0 ||
    pendingVoices.length > 0;

  const handleSend = useCallback(async () => {
    const text = displayContent.trim();
    const hasText = !!text;
    const hasFiles = pendingFiles.length > 0;
    const hasVoices = pendingVoices.length > 0;

    if (!hasText && !hasFiles && !hasVoices) return;
    if (isSending) return;

    if (editingMessageId) {
      if (hasText) {
        onSaveEdit(text);
        setEditContent("");
      }
      return;
    }

    // Envoyer les vocaux en premier
    if (hasVoices) {
      for (const v of pendingVoices) {
        onVoiceSend(v.blob, v.duration);
      }
      setPendingVoices([]);
    }

    // Envoyer les fichiers
    if (hasFiles) {
      for (const f of pendingFiles) {
        onUploadFile(f);
      }
      setPendingFiles([]);
    }

    // Envoyer le texte
    if (hasText) {
      onSend({
        content: text,
        contentType: "text",
        replyTo: replyTo?.id,
        isUrgent,
        scheduledAt: scheduledAt ?? undefined,
      });
    }

    setContent("");
    setIsUrgent(false);
    setScheduledAt(null);

    // Re-focus textarea
    setTimeout(() => textareaRef.current?.focus(), 0);
  }, [
    displayContent,
    editingMessageId,
    pendingFiles,
    pendingVoices,
    isSending,
    onSend,
    onSaveEdit,
    onUploadFile,
    onVoiceSend,
    replyTo,
    isUrgent,
    scheduledAt,
  ]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === "Escape" && editingMessageId) {
      onCancelEdit();
    }
  };

  const handleChange = (value: string) => {
    if (editingMessageId) {
      setEditContent(value);
    } else {
      setContent(value);
    }
    onTyping();
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) {
      setPendingFiles((prev) => [...prev, ...files]);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removePendingFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const removePendingVoice = (index: number) => {
    setPendingVoices((prev) => prev.filter((_, i) => i !== index));
  };

  const insertEmoji = (emoji: string) => {
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newContent =
        displayContent.slice(0, start) + emoji + displayContent.slice(end);
      if (editingMessageId) {
        setEditContent(newContent);
      } else {
        setContent(newContent);
      }
      // Deplacer le curseur apres l'emoji
      setTimeout(() => {
        textarea.selectionStart = start + emoji.length;
        textarea.selectionEnd = start + emoji.length;
        textarea.focus();
      }, 0);
    } else {
      if (editingMessageId) {
        setEditContent(displayContent + emoji);
      } else {
        setContent(displayContent + emoji);
      }
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
        <div className="flex items-center gap-2 border-b border-l-2 border-l-primary px-4 py-2 bg-muted/30">
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

      {/* Pending files preview */}
      {pendingFiles.length > 0 && (
        <div className="px-4 pt-3 pb-1 space-y-1.5">
          {pendingFiles.map((file, i) => (
            <div
              key={`file-${i}-${file.name}`}
              className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-xl border border-border/50"
            >
              <Paperclip className="w-4 h-4 text-primary shrink-0" />
              <span className="text-sm text-foreground truncate flex-1">
                {file.name}
              </span>
              <span className="text-xs text-muted-foreground shrink-0">
                {formatFileSize(file.size)}
              </span>
              <button
                onClick={() => removePendingFile(i)}
                className="w-5 h-5 rounded-md flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Pending voice previews */}
      {pendingVoices.length > 0 && (
        <div className="px-4 pt-3 pb-1 space-y-1.5">
          {pendingVoices.map((voice, i) => (
            <VoicePreview
              key={`voice-${i}`}
              blob={voice.blob}
              duration={voice.duration}
              levels={voice.levels}
              onRemove={() => removePendingVoice(i)}
            />
          ))}
        </div>
      )}

      {/* Main input area */}
      <div className="flex items-end gap-2 px-4 py-3">
        {/* File attach button */}
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
          multiple
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
            placeholder={
              channelName
                ? `Message ${channelName}...`
                : "Ecrivez un message..."
            }
            disabled={disabled}
            rows={1}
            className={cn(
              "w-full resize-none rounded-xl border bg-muted/30 px-4 py-2.5 text-sm",
              "ring-1 ring-border/50",
              "placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "max-h-40 scrollbar-thin",
              isUrgent &&
                "border-destructive/40 bg-destructive/5 animate-pulse",
            )}
          />
        </div>

        {/* Voice recorder */}
        <VoiceRecorder
          onRecordingComplete={(blob, duration, levels) =>
            setPendingVoices((prev) => [...prev, { blob, duration, levels }])
          }
        />

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
          <PopoverContent side="top" align="end" className="w-72 p-2">
            <div className="grid grid-cols-8 gap-1">
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
          disabled={disabled || isSending || !hasContent}
          size="icon"
          className={cn(
            "h-10 w-10 rounded-xl shrink-0",
            isUrgent
              ? "bg-destructive hover:bg-destructive/90"
              : scheduledAt
                ? "bg-amber-500 hover:bg-amber-600"
                : "bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70",
          )}
        >
          {isSending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : scheduledAt ? (
            <Clock className="h-4 w-4" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
