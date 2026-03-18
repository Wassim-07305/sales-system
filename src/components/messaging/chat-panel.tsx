"use client";

import { useState, useCallback, useMemo } from "react";
import { MessageSquare } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/hooks/use-user";
import { useMessages } from "@/lib/hooks/use-messages";
import { useTyping } from "@/lib/hooks/use-typing";
import { useMessagingStore } from "@/stores/messaging-store";
import { ChatHeader } from "./chat-header";
import { MessageList } from "./message-list";
import { ChatInput } from "./chat-input";
import { TypingIndicator } from "./typing-indicator";
import type { ChannelWithMeta, EnrichedMessage } from "@/lib/types/messaging";

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
  const { typingUsers, broadcastTyping, stopTyping } = useTyping(channel.id);
  const {
    replyToMessage,
    setReplyTo,
    editingMessageId,
    setEditingMessageId,
    setMobileSidebarOpen,
  } = useMessagingStore();

  const [editingContent, setEditingContent] = useState("");

  // Mark as read when viewing
  useState(() => {
    markAsRead();
  });

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

      const ext = file.name.split(".").pop() ?? "bin";
      const path = `messaging/${channel.id}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("attachments")
        .upload(path, file);

      if (uploadError) {
        console.error("Upload error:", uploadError);
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

  const handleToggleMute = useCallback(async () => {
    if (!user) return;
    await supabase
      .from("channel_members")
      .update({ is_muted: !channel.isMuted })
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
    <div className="flex flex-1 flex-col h-full">
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
        isSending={sendMessage.isPending}
        replyTo={replyToMessage}
        onCancelReply={() => setReplyTo(null)}
        editingMessageId={editingMessageId}
        editingContent={editingContent}
        onSaveEdit={handleSaveEdit}
        onCancelEdit={handleCancelEdit}
        onTyping={handleTyping}
        disabled={channel.is_archived}
      />
    </div>
  );
}
