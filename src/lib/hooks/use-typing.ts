"use client";

import { useEffect, useRef, useCallback, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/hooks/use-user";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface TypingUser {
  userId: string;
  fullName: string;
}

export function useTyping(channelId: string | null) {
  const supabase = useMemo(() => createClient(), []);
  const { user } = useUser();
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!channelId || !user) return;

    const ch = supabase.channel(`typing-${channelId}`, {
      config: { presence: { key: user.id } },
    });

    ch.on("presence", { event: "sync" }, () => {
      const state = ch.presenceState();
      const users: TypingUser[] = [];
      for (const [key, presences] of Object.entries(state)) {
        if (key === user.id) continue;
        const latest = presences[presences.length - 1] as Record<
          string,
          unknown
        >;
        if (latest?.typing) {
          users.push({
            userId: key,
            fullName: (latest.full_name as string) ?? "Quelqu'un",
          });
        }
      }
      setTypingUsers(users);
    }).subscribe();

    channelRef.current = ch;

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      // Untrack presence before removing channel to avoid ghost typing indicators
      ch.untrack().catch(() => {});
      supabase.removeChannel(ch);
      channelRef.current = null;
    };
  }, [supabase, channelId, user]);

  const broadcastTyping = useCallback(
    async (fullName: string) => {
      if (!channelRef.current || !user) return;
      await channelRef.current.track({
        user_id: user.id,
        full_name: fullName,
        typing: true,
      });
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(async () => {
        if (channelRef.current) {
          await channelRef.current.track({
            user_id: user.id,
            full_name: fullName,
            typing: false,
          });
        }
      }, 3000);
    },
    [user],
  );

  const stopTyping = useCallback(
    async (fullName: string) => {
      if (!channelRef.current || !user) return;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      await channelRef.current.track({
        user_id: user.id,
        full_name: fullName,
        typing: false,
      });
    },
    [user],
  );

  return { typingUsers, broadcastTyping, stopTyping };
}
