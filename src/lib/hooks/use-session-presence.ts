"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

export interface PresenceParticipant {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
}

interface UseSessionPresenceOptions {
  sessionId: string;
  /** Si fourni, track automatiquement ce user dans le channel */
  currentUser?: PresenceParticipant;
}

export function useSessionPresence({
  sessionId,
  currentUser,
}: UseSessionPresenceOptions) {
  const [participants, setParticipants] = useState<PresenceParticipant[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const syncParticipants = useCallback((channel: RealtimeChannel) => {
    const state = channel.presenceState<PresenceParticipant>();
    const users = new Map<string, PresenceParticipant>();
    for (const presences of Object.values(state)) {
      for (const p of presences) {
        users.set(p.user_id, {
          user_id: p.user_id,
          full_name: p.full_name,
          avatar_url: p.avatar_url,
        });
      }
    }
    setParticipants(Array.from(users.values()));
  }, []);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(`presence-live-${sessionId}`, {
      config: { presence: { key: currentUser?.user_id ?? "anonymous" } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        syncParticipants(channel);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED" && currentUser) {
          await channel.track({
            user_id: currentUser.user_id,
            full_name: currentUser.full_name,
            avatar_url: currentUser.avatar_url,
          });
        }
      });

    channelRef.current = channel;

    return () => {
      channel.untrack();
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [
    sessionId,
    currentUser?.user_id,
    currentUser?.full_name,
    currentUser?.avatar_url,
    syncParticipants,
  ]);

  return {
    participants,
    count: participants.length,
  };
}
