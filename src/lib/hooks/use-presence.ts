"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

interface PresenceUser {
  userId: string;
  userName: string;
  isTyping: boolean;
  onlineAt: string;
}

export function usePresence(
  channelId: string | null,
  userId: string,
  userName: string,
) {
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([]);
  const [typingUsers, setTypingUsers] = useState<PresenceUser[]>([]);
  const channelRef = useRef<ReturnType<
    ReturnType<typeof createClient>["channel"]
  > | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>(undefined);

  useEffect(() => {
    if (!channelId || !userId) return;
    const supabase = createClient();
    const channel = supabase.channel(`presence:${channelId}`);

    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState();
      const users: PresenceUser[] = [];
      Object.values(state).forEach((presences) => {
        (presences as unknown as PresenceUser[]).forEach((p) => {
          if (p.userId !== userId) users.push(p);
        });
      });
      setOnlineUsers(users);
      setTypingUsers(users.filter((u) => u.isTyping));
    });

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({
          userId,
          userName,
          isTyping: false,
          onlineAt: new Date().toISOString(),
        });
      }
    });

    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelId, userId, userName]);

  const setTyping = useCallback(
    (typing: boolean) => {
      if (channelRef.current) {
        channelRef.current.track({
          userId,
          userName,
          isTyping: typing,
          onlineAt: new Date().toISOString(),
        });
        if (typing) {
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => {
            channelRef.current?.track({
              userId,
              userName,
              isTyping: false,
              onlineAt: new Date().toISOString(),
            });
          }, 3000);
        }
      }
    },
    [userId, userName],
  );

  return { onlineUsers, typingUsers, setTyping };
}
