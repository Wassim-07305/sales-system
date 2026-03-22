"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/hooks/use-user";
import { useMessages } from "@/lib/hooks/use-messages";
import { useTyping } from "@/lib/hooks/use-typing";
import { useChannelMembers } from "@/lib/hooks/use-channels";
import { useMessagingStore } from "@/stores/messaging-store";
import { ChatHeader } from "./chat-header";
import { MessageList } from "./message-list";
import { ChatInput } from "./chat-input";
import { TypingIndicator } from "./typing-indicator";
import type { ChannelWithMeta, EnrichedMessage } from "@/lib/types/messaging";
import type { MentionUser } from "./mention-autocomplete";

interface ChatPanelProps {
  channel: ChannelWithMeta;
  memberCount: number;
  onOpenSettings: () => void;
  onBack?: () => void;
}

export function ChatPanel({
  channel,
  memberCount,
  onOpenSettings,
  onBack,
}: ChatPanelProps) {
  const supabase = useMemo(() => createClient(), []);
  const { user, profile } = useUser();
  const {
    messages,
    isLoading,
    sendMessage,
    editMessage,
    deleteMessage,
    togglePin,
    toggleReaction,
    addAttachment,
    markAsRead,
  } = useMessages(channel.id);
  const { members: channelMembers } = useChannelMembers(channel.id);
  const { typingUsers, broadcastTyping, stopTyping } = useTyping(channel.id);
  const {
    replyToMessage,
    setReplyTo,
    editingMessageId,
    setEditingMessageId,
    setMobileSidebarOpen,
  } = useMessagingStore();

  const [editingContent, setEditingContent] = useState("");
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [droppedFile, setDroppedFile] = useState<File | null>(null);

  // Mention users derived from channel members
  const mentionUsers: MentionUser[] = useMemo(() => {
    return channelMembers
      .filter((m) => m.profile && m.profile_id !== user?.id)
      .map((m) => ({
        id: m.profile!.id,
        full_name: m.profile!.full_name,
        avatar_url: m.profile!.avatar_url ?? null,
        role: m.profile!.role,
      }));
  }, [channelMembers, user?.id]);

  // Mark as read when viewing or switching channels
  useEffect(() => {
    markAsRead();
  }, [channel.id, markAsRead]);

  const handleSend = useCallback(
    (params: {
      content: string;
      contentType?: string;
      replyTo?: string;
      isUrgent?: boolean;
      scheduledAt?: string;
    }) => {
      sendMessage.mutate(params);
      setReplyTo(null);
      if (profile?.full_name) {
        stopTyping(profile.full_name);
      }
    },
    [sendMessage, setReplyTo, stopTyping, profile],
  );

  const handleReply = useCallback(
    (msg: EnrichedMessage) => {
      setReplyTo({
        id: msg.id,
        content: msg.content,
        senderName: msg.sender?.full_name ?? "Inconnu",
      });
    },
    [setReplyTo],
  );

  const handleEdit = useCallback(
    (messageId: string) => {
      const msg = messages.find((m) => m.id === messageId);
      if (msg) {
        setEditingMessageId(messageId);
        setEditingContent(msg.content);
      }
    },
    [messages, setEditingMessageId],
  );

  const handleSaveEdit = useCallback(
    (content: string) => {
      if (editingMessageId) {
        editMessage.mutate({ id: editingMessageId, content });
        setEditingMessageId(null);
        setEditingContent("");
      }
    },
    [editingMessageId, editMessage, setEditingMessageId],
  );

  const handleCancelEdit = useCallback(() => {
    setEditingMessageId(null);
    setEditingContent("");
  }, [setEditingMessageId]);

  const handleDelete = useCallback(
    (messageId: string) => {
      deleteMessage.mutate(messageId);
    },
    [deleteMessage],
  );

  const handleTogglePin = useCallback(
    (messageId: string, pinned: boolean) => {
      togglePin.mutate({ id: messageId, pinned });
    },
    [togglePin],
  );

  const handleToggleReaction = useCallback(
    (messageId: string, emoji: string) => {
      toggleReaction.mutate({ messageId, emoji });
    },
    [toggleReaction],
  );

  const handleUploadFile = useCallback(
    async (file: File) => {
      if (!user) return;

      // Validate file size (max 50 MB)
      const MAX_FILE_SIZE = 50 * 1024 * 1024;
      if (file.size > MAX_FILE_SIZE) {
        toast.error("Le fichier est trop volumineux (max 50 Mo)");
        return;
      }

      const ext = file.name.split(".").pop() ?? "bin";
      const path = `messaging/${channel.id}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("attachments")
        .upload(path, file);

      if (uploadError) {
        toast.error("Erreur lors de l'upload du fichier");
        return;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("attachments").getPublicUrl(path);

      // Determine content type
      let contentType = "file";
      if (file.type.startsWith("image/")) contentType = "image";
      else if (file.type.startsWith("video/")) contentType = "video";
      else if (file.type.startsWith("audio/")) contentType = "audio";

      // Send a message with the file
      const result = await sendMessage.mutateAsync({
        content: file.name,
        contentType,
      });

      if (result?.id) {
        addAttachment.mutate({
          messageId: result.id,
          fileName: file.name,
          fileUrl: publicUrl,
          fileType: file.type,
          fileSize: file.size,
        });
      }
    },
    [user, channel.id, supabase, sendMessage, addAttachment],
  );

  const handleVoiceSend = useCallback(
    async (blob: Blob, duration: number) => {
      if (!user) return;

      const ext = blob.type.includes("mp4")
        ? "m4a"
        : blob.type.includes("ogg")
          ? "ogg"
          : "webm";
      const path = `messaging/${channel.id}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("attachments")
        .upload(path, blob);

      if (uploadError) {
        toast.error("Erreur lors de l'upload du vocal");
        return;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("attachments").getPublicUrl(path);

      const result = await sendMessage.mutateAsync({
        content: `Message vocal (${Math.ceil(duration)}s)`,
        contentType: "audio",
      });

      if (result?.id) {
        addAttachment.mutate({
          messageId: result.id,
          fileName: `vocal-${Date.now()}.${ext}`,
          fileUrl: publicUrl,
          fileType: blob.type || "audio/webm",
          fileSize: blob.size,
        });
      }

      toast.success("Message vocal envoyé");
    },
    [user, channel.id, supabase, sendMessage, addAttachment],
  );

  const handleToggleMute = useCallback(async () => {
    if (!user) return;
    await supabase
      .from("channel_members")
      .update({ notifications_muted: !channel.isMuted })
      .eq("channel_id", channel.id)
      .eq("profile_id", user.id);
  }, [user, channel, supabase]);

  const handleToggleArchive = useCallback(async () => {
    await supabase
      .from("channels")
      .update({ is_archived: !channel.is_archived })
      .eq("id", channel.id);
  }, [channel, supabase]);

  const handleTyping = useCallback(() => {
    if (profile?.full_name) {
      broadcastTyping(profile.full_name);
    }
  }, [broadcastTyping, profile]);

  if (!user) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <MessageSquare className="h-8 w-8 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div
      className="flex flex-1 flex-col min-h-0 relative animate-fade-in"
      onDragOver={(e) => {
        e.preventDefault();
        setIsDraggingOver(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setIsDraggingOver(false);
        }
      }}
      onDrop={(e) => {
        e.preventDefault();
        setIsDraggingOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) setDroppedFile(file);
      }}
    >
      {isDraggingOver && (
        <div className="absolute inset-0 z-50 bg-primary/5 border-2 border-dashed border-primary rounded-2xl flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <p className="text-sm font-medium text-primary">
              Déposer le fichier ici
            </p>
          </div>
        </div>
      )}

      <ChatHeader
        channel={channel}
        memberCount={memberCount}
        onToggleMute={handleToggleMute}
        onToggleArchive={handleToggleArchive}
        onOpenSettings={onOpenSettings}
        onBack={onBack}
      />

      <MessageList
        messages={messages}
        isLoading={isLoading}
        currentUserId={user.id}
        onReply={handleReply}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onTogglePin={handleTogglePin}
        onToggleReaction={handleToggleReaction}
      />

      <TypingIndicator typingUsers={typingUsers} />

      <ChatInput
        onSend={handleSend}
        onUploadFile={handleUploadFile}
        onVoiceSend={handleVoiceSend}
        isSending={sendMessage.isPending}
        replyTo={replyToMessage}
        onCancelReply={() => setReplyTo(null)}
        editingMessageId={editingMessageId}
        editingContent={editingContent}
        onSaveEdit={handleSaveEdit}
        onCancelEdit={handleCancelEdit}
        onTyping={handleTyping}
        disabled={channel.is_archived}
        channelName={channel.dmPartner?.full_name ?? channel.name}
        droppedFile={droppedFile}
        onClearDroppedFile={() => setDroppedFile(null)}
        members={mentionUsers}
      />
    </div>
  );
}
