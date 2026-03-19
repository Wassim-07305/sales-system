"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/hooks/use-user";
import { useEffect, useMemo } from "react";

interface UnreadCountRow {
  channel_id: string;
  unread_count: number;
  urgent_unread_count: number;
}

/**
 * Recupere les compteurs de messages non lus pour tous les channels du user.
 * Utilise Supabase Realtime pour se mettre a jour en temps reel.
 */
export function useUnreadCounts() {
  const supabase = useMemo(() => createClient(), []);
  const queryClient = useQueryClient();
  const { user } = useUser();

  const query = useQuery({
    queryKey: ["unread-counts", user?.id],
    staleTime: 10_000,
    queryFn: async () => {
      if (!user) return {};

      // Recuperer les memberships du user avec last_read_at
      const { data: memberships, error: memErr } = await supabase
        .from("channel_members")
        .select("channel_id, last_read_at, notifications_muted")
        .eq("profile_id", user.id);
      if (memErr) throw memErr;
      if (!memberships || memberships.length === 0) return {};

      // Pour chaque channel, compter les messages apres last_read_at
      const counts: Record<string, { unread: number; urgent: number }> = {};

      // Batch: recuperer tous les messages recents en une seule query
      const channelIds = memberships.map((m) => m.channel_id);
      const { data: messages, error: msgErr } = await supabase
        .from("messages")
        .select("channel_id, is_urgent, created_at")
        .in("channel_id", channelIds)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(1000);
      if (msgErr) throw msgErr;

      // Construire une map channel_id -> last_read_at
      const lastReadMap = new Map<
        string,
        { lastRead: string | null; muted: boolean }
      >();
      for (const m of memberships) {
        lastReadMap.set(m.channel_id, {
          lastRead: m.last_read_at,
          muted: m.notifications_muted ?? false,
        });
      }

      // Compter les unread
      for (const msg of messages ?? []) {
        const membership = lastReadMap.get(msg.channel_id);
        if (!membership) continue;
        // Si mute, on ne compte pas
        if (membership.muted) continue;
        // Si pas de last_read_at, tout est non lu
        if (membership.lastRead && msg.created_at <= membership.lastRead)
          continue;

        if (!counts[msg.channel_id]) {
          counts[msg.channel_id] = { unread: 0, urgent: 0 };
        }
        counts[msg.channel_id].unread++;
        if (msg.is_urgent) {
          counts[msg.channel_id].urgent++;
        }
      }

      return counts;
    },
    enabled: !!user,
  });

  // Realtime: invalider quand un message est envoye ou quand last_read_at change
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("unread-counts-updates")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["unread-counts"] });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "channel_members",
          filter: `profile_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["unread-counts"] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, user, queryClient]);

  const unreadMap = query.data ?? {};

  // Total global pour le badge sidebar
  const totalUnread = Object.values(unreadMap).reduce(
    (sum, c) => sum + c.unread,
    0,
  );

  return { unreadMap, totalUnread };
}
