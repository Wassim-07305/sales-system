"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/hooks/use-user";
import { useEffect, useCallback, useMemo } from "react";
import type { EnrichedMessage } from "@/lib/types/messaging";

export function useMessages(channelId: string | null) {
  const supabase = useMemo(() => createClient(), []);
  const queryClient = useQueryClient();
  const { user } = useUser();

  const messagesQuery = useQuery({
    queryKey: ["messages", channelId],
    retry: 1,
    staleTime: 0,
    queryFn: async () => {
      if (!channelId) return [];
      // Explicit columns to avoid pulling JSONB/object columns via select('*')
      const { data, error } = await supabase
        .from("messages")
        .select(
          `id, channel_id, sender_id, content, content_type, message_type,
          file_url, file_name, is_edited, is_pinned, is_urgent, reply_to,
          reply_count, scheduled_at, deleted_at, created_at, updated_at, is_ai_generated,
          sender:profiles!messages_sender_id_fkey(id, full_name, avatar_url, role),
          reactions:message_reactions(id, emoji, user_id),
          attachments:message_attachments(id, file_name, file_url, file_type, file_size)`,
        )
        .eq("channel_id", channelId)
        .is("deleted_at", null)
        .order("created_at", { ascending: true })
        .limit(200);
      if (error) throw error;

      return (data ?? []).map((raw): EnrichedMessage => {
        const msg = raw as Record<string, unknown>;
        const rawSender = msg.sender;
        const sender = Array.isArray(rawSender) ? rawSender[0] : rawSender;
        return {
          id: msg.id as string,
          channel_id: msg.channel_id as string,
          sender_id: msg.sender_id as string,
          content: typeof msg.content === "string" ? msg.content : String(msg.content ?? ""),
          content_type: (msg.content_type as string) ?? "text",
          message_type: (msg.message_type as string) ?? "text",
          file_url: (msg.file_url as string | null) ?? null,
          file_name: (msg.file_name as string | null) ?? null,
          is_edited: !!(msg.is_edited as boolean),
          is_pinned: !!(msg.is_pinned as boolean),
          is_urgent: !!(msg.is_urgent as boolean),
          reply_to: (msg.reply_to as string | null) ?? null,
          reply_count: (msg.reply_count as number) ?? 0,
          scheduled_at: (msg.scheduled_at as string | null) ?? null,
          deleted_at: (msg.deleted_at as string | null) ?? null,
          created_at: msg.created_at as string,
          updated_at: msg.updated_at as string,
          is_ai_generated: !!(msg.is_ai_generated as boolean),
          metadata: {},
          sender: sender && typeof sender === "object"
            ? (sender as EnrichedMessage["sender"])
            : null,
          reactions: Array.isArray(msg.reactions) ? msg.reactions : [],
          attachments: Array.isArray(msg.attachments) ? msg.attachments : [],
        };
      });
    },
    enabled: !!channelId,
  });

  // Realtime subscription
  useEffect(() => {
    if (!channelId) return;
    const channel = supabase
      .channel(`msg-${channelId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `channel_id=eq.${channelId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["messages", channelId] });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "message_reactions" },
        () =>
          queryClient.invalidateQueries({ queryKey: ["messages", channelId] }),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, channelId, queryClient]);

  // Optimistic send
  const sendMessage = useMutation({
    mutationFn: async ({
      content,
      contentType = "text",
      replyTo,
      scheduledAt,
      isUrgent = false,
    }: {
      content: string;
      contentType?: string;
      replyTo?: string;
      scheduledAt?: string;
      isUrgent?: boolean;
    }) => {
      if (!channelId || !user) throw new Error("Missing channel or user");
      if (content.length > 5000) throw new Error("Message trop long (max 5000 caractères)");
      const { data, error } = await supabase
        .from("messages")
        .insert({
          channel_id: channelId,
          sender_id: user.id,
          content,
          content_type: contentType,
          message_type: contentType,
          reply_to: replyTo ?? null,
          scheduled_at: scheduledAt ?? null,
          is_urgent: isUrgent,
        })
        .select("id")
        .single();
      if (error) throw error;
      return data;
    },
    onMutate: async ({
      content,
      contentType = "text",
      replyTo,
      isUrgent = false,
    }) => {
      if (!user) return;
      await queryClient.cancelQueries({ queryKey: ["messages", channelId] });
      const previousMessages = queryClient.getQueryData<EnrichedMessage[]>([
        "messages",
        channelId,
      ]);

      const optimisticMsg: EnrichedMessage = {
        id: `optimistic-${Date.now()}`,
        channel_id: channelId!,
        sender_id: user.id,
        content,
        content_type: contentType,
        message_type: contentType,
        file_url: null,
        file_name: null,
        reply_to: replyTo ?? null,
        is_pinned: false,
        is_edited: false,
        is_urgent: isUrgent,
        reply_count: 0,
        scheduled_at: null,
        metadata: {},
        deleted_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_ai_generated: false,
        sender: {
          id: user.id,
          full_name: user.user_metadata?.full_name ?? "Moi",
          avatar_url: user.user_metadata?.avatar_url ?? null,
          role: user.user_metadata?.role ?? "setter",
        },
        reactions: [],
        attachments: [],
        reply_message: null,
      };

      queryClient.setQueryData<EnrichedMessage[]>(
        ["messages", channelId],
        (old) => [...(old ?? []), optimisticMsg],
      );

      return { previousMessages };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousMessages) {
        queryClient.setQueryData(
          ["messages", channelId],
          context.previousMessages,
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", channelId] });
      queryClient.invalidateQueries({ queryKey: ["channels"] });
    },
  });

  // Edit
  const editMessage = useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      const { error } = await supabase
        .from("messages")
        .update({
          content,
          is_edited: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, content }) => {
      await queryClient.cancelQueries({ queryKey: ["messages", channelId] });
      const previous = queryClient.getQueryData<EnrichedMessage[]>([
        "messages",
        channelId,
      ]);
      queryClient.setQueryData<EnrichedMessage[]>(
        ["messages", channelId],
        (old) =>
          (old ?? []).map((m) =>
            m.id === id ? { ...m, content, is_edited: true } : m,
          ),
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous)
        queryClient.setQueryData(["messages", channelId], ctx.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", channelId] });
    },
  });

  // Delete (soft)
  const deleteMessage = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("messages")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["messages", channelId] });
      const previous = queryClient.getQueryData<EnrichedMessage[]>([
        "messages",
        channelId,
      ]);
      queryClient.setQueryData<EnrichedMessage[]>(
        ["messages", channelId],
        (old) => (old ?? []).filter((m) => m.id !== id),
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous)
        queryClient.setQueryData(["messages", channelId], ctx.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", channelId] });
    },
  });

  // Toggle pin
  const togglePin = useMutation({
    mutationFn: async ({ id, pinned }: { id: string; pinned: boolean }) => {
      const { error } = await supabase
        .from("messages")
        .update({ is_pinned: !pinned })
        .eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, pinned }) => {
      await queryClient.cancelQueries({ queryKey: ["messages", channelId] });
      const previous = queryClient.getQueryData<EnrichedMessage[]>([
        "messages",
        channelId,
      ]);
      queryClient.setQueryData<EnrichedMessage[]>(
        ["messages", channelId],
        (old) =>
          (old ?? []).map((m) =>
            m.id === id ? { ...m, is_pinned: !pinned } : m,
          ),
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous)
        queryClient.setQueryData(["messages", channelId], ctx.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", channelId] });
    },
  });

  // Toggle reaction
  const toggleReaction = useMutation({
    mutationFn: async ({
      messageId,
      emoji,
    }: {
      messageId: string;
      emoji: string;
    }) => {
      if (!user) throw new Error("Not authenticated");
      const { data: existing } = await supabase
        .from("message_reactions")
        .select("id")
        .eq("message_id", messageId)
        .eq("user_id", user.id)
        .eq("emoji", emoji)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("message_reactions")
          .delete()
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("message_reactions")
          .insert({ message_id: messageId, user_id: user.id, emoji });
        if (error) throw error;
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", channelId] });
    },
  });

  // Add attachment
  const addAttachment = useMutation({
    mutationFn: async ({
      messageId,
      fileName,
      fileUrl,
      fileType,
      fileSize,
    }: {
      messageId: string;
      fileName: string;
      fileUrl: string;
      fileType: string;
      fileSize: number;
    }) => {
      const { error } = await supabase.from("message_attachments").insert({
        message_id: messageId,
        file_name: fileName,
        file_url: fileUrl,
        file_type: fileType,
        file_size: fileSize,
      });
      if (error) throw error;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", channelId] });
    },
  });

  // Mark as read
  const markAsRead = useCallback(async () => {
    if (!channelId || !user) return;
    await supabase
      .from("channel_members")
      .update({ last_read_at: new Date().toISOString() })
      .eq("channel_id", channelId)
      .eq("profile_id", user.id);
  }, [channelId, user, supabase]);

  return {
    messages: messagesQuery.data ?? [],
    isLoading: messagesQuery.isLoading,
    sendMessage,
    editMessage,
    deleteMessage,
    togglePin,
    toggleReaction,
    addAttachment,
    markAsRead,
  };
}
