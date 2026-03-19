"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { PresenceParticipant } from "./use-session-presence";

interface SessionPresenceData {
  count: number;
  participants: PresenceParticipant[];
}

export function useHubPresence(sessionIds: string[]) {
  const [presenceMap, setPresenceMap] = useState<
    Record<string, SessionPresenceData>
  >({});
  const channelsRef = useRef<Map<string, RealtimeChannel>>(new Map());

  const syncChannel = useCallback(
    (sessionId: string, channel: RealtimeChannel) => {
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
      const participants = Array.from(users.values());
      setPresenceMap((prev) => ({
        ...prev,
        [sessionId]: { count: participants.length, participants },
      }));
    },
    [],
  );

  useEffect(() => {
    const supabase = createClient();
    const currentChannels = channelsRef.current;

    // Supprimer les channels qui ne sont plus dans sessionIds
    for (const [id, channel] of currentChannels) {
      if (!sessionIds.includes(id)) {
        supabase.removeChannel(channel);
        currentChannels.delete(id);
        setPresenceMap((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      }
    }

    // Ajouter les nouveaux channels
    for (const sessionId of sessionIds) {
      if (currentChannels.has(sessionId)) continue;

      const channel = supabase.channel(`presence-live-${sessionId}`);
      channel
        .on("presence", { event: "sync" }, () => {
          syncChannel(sessionId, channel);
        })
        .subscribe();

      currentChannels.set(sessionId, channel);
    }

    return () => {
      for (const [, channel] of currentChannels) {
        supabase.removeChannel(channel);
      }
      currentChannels.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionIds.join(","), syncChannel]);

  return { presenceMap };
}
