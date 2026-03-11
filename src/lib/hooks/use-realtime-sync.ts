"use client";
import { useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Node, Edge } from "@xyflow/react";

interface RealtimeSyncOptions {
  scriptId: string | null;
  userId: string;
  onRemoteUpdate: (data: { nodes: Node[]; edges: Edge[]; fromUser: string }) => void;
}

export function useRealtimeSync({ scriptId, userId, onRemoteUpdate }: RealtimeSyncOptions) {
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);
  const lastBroadcastRef = useRef<number>(0);

  useEffect(() => {
    if (!scriptId || !userId) return;
    const supabase = createClient();
    const channel = supabase.channel(`script-sync:${scriptId}`);

    channel.on("broadcast", { event: "sync" }, (payload) => {
      const data = payload.payload as { nodes: Node[]; edges: Edge[]; fromUser: string };
      if (data.fromUser !== userId) {
        onRemoteUpdate(data);
      }
    });

    channel.subscribe();
    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [scriptId, userId, onRemoteUpdate]);

  const broadcastChanges = useCallback(
    (nodes: Node[], edges: Edge[]) => {
      // Throttle broadcasts to max 1 per second
      const now = Date.now();
      if (now - lastBroadcastRef.current < 1000) return;
      lastBroadcastRef.current = now;

      if (channelRef.current) {
        channelRef.current.send({
          type: "broadcast",
          event: "sync",
          payload: { nodes, edges, fromUser: userId },
        });
      }
    },
    [userId]
  );

  return { broadcastChanges };
}
