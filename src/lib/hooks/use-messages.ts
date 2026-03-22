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
      const { data, error } = await supabase
        .from("messages")
        .select(
          `*,
          sender:profiles!messages_sender_id_fkey(id, full_name, avatar_url, role),
          reactions:message_reactions(id, emoji, user_id),
          attachments:message_attachments(id, file_name, file_url, file_type, file_size)`,
        )
        .eq("channel_id", channelId)
        .is("deleted_at", null)
        .order("created_at", { ascending: true })
        .limit(200);
      if (error) throw error;

      // DEBUG: dump raw message data to diagnose React #310
      if (data && data.length > 0) {
        const raw = data[0] as Record<string, unknown>;
        console.log("[useMessages] RAW msg[0] keys:", Object.keys(raw));
        for (const [key, val] of Object.entries(raw)) {
          if (val !== null && typeof val === "object" && !Array.isArray(val)) {
            console.warn("[useMessages] OBJECT field:", key, "=", JSON.stringify(val).slice(0, 200));
          }
        }
      }

      // Sanitize data from Supabase to prevent React #310:
      // - content may be null (TEXT nullable) → coerce to string
      // - sender may be an array if FK detection fails → unwrap
      // - reactions/attachments must be arrays
      // - metadata JSONB must not leak as renderable child
      return ((data ?? []) as EnrichedMessage[]).map((msg) => ({
        ...msg,
        content:
          typeof msg.content === "string"
            ? msg.content
            : String(msg.content ?? ""),
        sender: Array.isArray(msg.sender)
          ? msg.sender[0] ?? null
          : msg.sender ?? null,
        reactions: Array.isArray(msg.reactions) ? msg.reactions : [],
        attachments: Array.isArray(msg.attachments) ? msg.attachments : [],
        // Ensure metadata stays as object (not rendered directly)
        metadata: typeof msg.metadata === "object" && msg.metadata !== null ? msg.metadata : {},
      }));
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
