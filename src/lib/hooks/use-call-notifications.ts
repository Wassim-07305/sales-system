"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/hooks/use-user";
import { useCallStore } from "@/stores/call-store";

export function useCallNotifications() {
  const supabase = createClient();
  const { user } = useUser();
  const userId = user?.id;

  useEffect(() => {
    if (!userId) return;

    const channel = supabase.channel(`live-notify-${userId}`, {
      config: { broadcast: { self: false } },
    });

    channel
      .on("broadcast", { event: "incoming-call" }, ({ payload }) => {
        const { sessionId, callerName } = payload as {
          sessionId: string;
          callerName: string;
        };
        useCallStore.getState().setIncomingCall(sessionId, callerName);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, supabase]);

  const dismissIncoming = () => {
    useCallStore.getState().setIncomingCall(null, null);
  };

  return { dismissIncoming };
}

export async function notifyPeer(
  supabase: ReturnType<typeof createClient>,
  peerId: string,
  sessionId: string,
  callerName: string,
) {
  const channel = supabase.channel(`live-notify-${peerId}`);
  await channel.subscribe();
  await channel.send({
    type: "broadcast",
    event: "incoming-call",
    payload: { sessionId, callerName },
  });
  supabase.removeChannel(channel);
}
