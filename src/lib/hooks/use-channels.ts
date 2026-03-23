"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/hooks/use-user";
import { useEffect, useMemo, useRef } from "react";

interface ChannelMember {
  id: string;
  channel_id: string;
  profile_id: string;
  role: string;
  last_read_at: string | null;
  notifications_muted: boolean;
  is_pinned: boolean;
  joined_at: string;
  profile?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    role: string;
  };
}

interface Channel {
  id: string;
  name: string;
  description: string | null;
  type: string;
  created_by: string;
  is_archived: boolean;
  created_at: string;
  last_message_at: string | null;
  members: ChannelMember[];
}

// ─── useChannels ─────────────────────────────────────────────

export function useChannels() {
  const supabase = useMemo(() => createClient(), []);
  const queryClient = useQueryClient();
  const { user, profile } = useUser();

  const isStaff = profile?.role === "admin" || profile?.role === "manager";

  const channelsQuery = useQuery({
    queryKey: ["channels"],
    retry: 1,
    staleTime: 30_000,
    queryFn: async () => {
      if (!user) return [];

      // Fetch channels the user is a member of
      const { data: memberChannels, error: memberErr } = await supabase
        .from("channel_members")
        .select("channel_id")
        .eq("profile_id", user.id);
      if (memberErr) throw memberErr;

      const channelIds = (memberChannels ?? []).map((m) => m.channel_id);
      if (channelIds.length === 0) return [];

      // Explicit columns to avoid pulling unknown object/array columns (e.g. members UUID[])
      const { data, error } = await supabase
        .from("channels")
        .select(
          `id, name, description, type, created_by, is_archived, created_at, last_message_at,
          members:channel_members(
            id, channel_id, profile_id, role, last_read_at, notifications_muted, is_pinned, joined_at,
            profile:profiles(id, full_name, avatar_url, role)
          )`,
        )
        .in("id", channelIds)
        .order("last_message_at", { ascending: false, nullsFirst: false });
      if (error) throw error;

      // Sanitize: explicit field picking prevents unknown columns from leaking
      // Cast through unknown because raw Supabase join types differ from our Channel type
      return (data ?? []).map((raw): Channel => {
        const ch = raw as Record<string, unknown>;
        const rawMembers = Array.isArray(ch.members) ? ch.members : [];
        return {
          id: ch.id as string,
          name: typeof ch.name === "string" ? ch.name : String(ch.name ?? ""),
          description:
            ch.description == null
              ? null
              : typeof ch.description === "string"
                ? (ch.description as string)
                : String(ch.description),
          type: ch.type as string,
          created_by: ch.created_by as string,
          is_archived: !!(ch.is_archived as boolean),
          created_at: ch.created_at as string,
          last_message_at: (ch.last_message_at as string | null),
          members: rawMembers
            .filter((m): m is Record<string, unknown> => typeof m === "object" && m !== null)
            .map((m) => {
              const rawProfile = m.profile;
              const profile = Array.isArray(rawProfile) ? rawProfile[0] : rawProfile;
              return {
                id: m.id as string,
                channel_id: m.channel_id as string,
                profile_id: m.profile_id as string,
                role: m.role as string,
                last_read_at: m.last_read_at as string | null,
                notifications_muted: !!(m.notifications_muted as boolean),
                is_pinned: !!(m.is_pinned as boolean),
                joined_at: m.joined_at as string,
                profile: profile && typeof profile === "object"
                  ? (profile as ChannelMember["profile"])
                  : undefined,
              };
            }),
        };
      });
    },
    enabled: !!user,
  });

  // Realtime subscription for channels
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("channels-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "channels" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["channels"] });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "channel_members" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["channels"] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, user, queryClient]);

  const allChannels = channelsQuery.data ?? [];

  const publicChannels = allChannels.filter(
    (c) =>
      !c.is_archived &&
      ["group", "announcement", "private", "public"].includes(c.type),
  );

  const dmChannels = allChannels.filter(
    (c) => !c.is_archived && (c.type === "direct" || c.type === "dm"),
  );

  const archivedChannels = allChannels.filter((c) => c.is_archived);

  // Create channel
  const createChannel = useMutation({
    mutationFn: async ({
      name,
      description,
      type = "group",
      memberIds = [],
    }: {
      name: string;
      description?: string;
      type?: string;
      memberIds?: string[];
    }) => {
      if (!user) throw new Error("Non authentifie");

      const { data: channel, error } = await supabase
        .from("channels")
        .insert({
          name,
          description: description ?? null,
          type,
          created_by: user.id,
        })
        .select("id")
        .single();
      if (error) throw error;

      // Add creator as admin member
      const members = [
        { channel_id: channel.id, profile_id: user.id, role: "admin" },
        ...memberIds
          .filter((id) => id !== user.id)
          .map((id) => ({
            channel_id: channel.id,
            profile_id: id,
            role: "member" as const,
          })),
      ];

      const { error: membersErr } = await supabase
        .from("channel_members")
        .insert(members);
      if (membersErr) throw membersErr;

      return channel;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["channels"] });
    },
  });

  // Track in-flight DM creations to prevent duplicates from concurrent clicks
  const dmCreatingForRef = useRef<Set<string>>(new Set());

  // Create DM channel
  const createDMChannel = useMutation({
    mutationFn: async ({ targetUserId }: { targetUserId: string }) => {
      if (!user) throw new Error("Non authentifie");

      // Prevent concurrent creation for the same user
      if (dmCreatingForRef.current.has(targetUserId)) {
        throw new Error("Création en cours");
      }
      dmCreatingForRef.current.add(targetUserId);

      try {
        // Check if DM already exists between these two users
        const { data: existingMembers } = await supabase
          .from("channel_members")
          .select("channel_id")
          .eq("profile_id", user.id);

        const myChannelIds = (existingMembers ?? []).map((m) => m.channel_id);

        if (myChannelIds.length > 0) {
          const { data: targetMembers } = await supabase
            .from("channel_members")
            .select("channel_id")
            .eq("profile_id", targetUserId)
            .in("channel_id", myChannelIds);

          const sharedChannelIds = (targetMembers ?? []).map((m) => m.channel_id);

          if (sharedChannelIds.length > 0) {
            const { data: existingDM } = await supabase
              .from("channels")
              .select("id")
              .in("id", sharedChannelIds)
              .in("type", ["direct", "dm"])
              .limit(1)
              .maybeSingle();

            if (existingDM) return existingDM;
          }
        }

        // Create new DM channel
        const { data: channel, error } = await supabase
          .from("channels")
          .insert({
            name: "DM",
            type: "direct",
            created_by: user.id,
          })
          .select("id")
          .single();
        if (error) throw error;

        const { error: membersErr } = await supabase
          .from("channel_members")
          .insert([
            { channel_id: channel.id, profile_id: user.id, role: "member" },
            {
              channel_id: channel.id,
              profile_id: targetUserId,
              role: "member",
            },
          ]);
        if (membersErr) throw membersErr;

        return channel;
      } finally {
        dmCreatingForRef.current.delete(targetUserId);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["channels"] });
    },
  });

  // Mute channel
  const muteChannel = useMutation({
    mutationFn: async (channelId: string) => {
      if (!user) throw new Error("Non authentifie");
      const { error } = await supabase
        .from("channel_members")
        .update({ notifications_muted: true })
        .eq("channel_id", channelId)
        .eq("profile_id", user.id);
      if (error) throw error;
    },
    onMutate: async (channelId) => {
      await queryClient.cancelQueries({ queryKey: ["channels"] });
      const previous = queryClient.getQueryData<Channel[]>(["channels"]);
      queryClient.setQueryData<Channel[]>(["channels"], (old) =>
        (old ?? []).map((c) =>
          c.id === channelId
            ? {
                ...c,
                members: c.members.map((m) =>
                  m.profile_id === user?.id
                    ? { ...m, notifications_muted: true }
                    : m,
                ),
              }
            : c,
        ),
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(["channels"], ctx.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["channels"] });
    },
  });

  // Unmute channel
  const unmuteChannel = useMutation({
    mutationFn: async (channelId: string) => {
      if (!user) throw new Error("Non authentifie");
      const { error } = await supabase
        .from("channel_members")
        .update({ notifications_muted: false })
        .eq("channel_id", channelId)
        .eq("profile_id", user.id);
      if (error) throw error;
    },
    onMutate: async (channelId) => {
      await queryClient.cancelQueries({ queryKey: ["channels"] });
      const previous = queryClient.getQueryData<Channel[]>(["channels"]);
      queryClient.setQueryData<Channel[]>(["channels"], (old) =>
        (old ?? []).map((c) =>
          c.id === channelId
            ? {
                ...c,
                members: c.members.map((m) =>
                  m.profile_id === user?.id
                    ? { ...m, notifications_muted: false }
                    : m,
                ),
              }
            : c,
        ),
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(["channels"], ctx.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["channels"] });
    },
  });

  // Archive channel (staff only)
  const archiveChannel = useMutation({
    mutationFn: async (channelId: string) => {
      if (!isStaff) throw new Error("Non autorise");
      const { error } = await supabase
        .from("channels")
        .update({ is_archived: true })
        .eq("id", channelId);
      if (error) throw error;
    },
    onMutate: async (channelId) => {
      await queryClient.cancelQueries({ queryKey: ["channels"] });
      const previous = queryClient.getQueryData<Channel[]>(["channels"]);
      queryClient.setQueryData<Channel[]>(["channels"], (old) =>
        (old ?? []).map((c) =>
          c.id === channelId ? { ...c, is_archived: true } : c,
        ),
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(["channels"], ctx.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["channels"] });
    },
  });

  // Unarchive channel (staff only)
  const unarchiveChannel = useMutation({
    mutationFn: async (channelId: string) => {
      if (!isStaff) throw new Error("Non autorise");
      const { error } = await supabase
        .from("channels")
        .update({ is_archived: false })
        .eq("id", channelId);
      if (error) throw error;
    },
    onMutate: async (channelId) => {
      await queryClient.cancelQueries({ queryKey: ["channels"] });
      const previous = queryClient.getQueryData<Channel[]>(["channels"]);
      queryClient.setQueryData<Channel[]>(["channels"], (old) =>
        (old ?? []).map((c) =>
          c.id === channelId ? { ...c, is_archived: false } : c,
        ),
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(["channels"], ctx.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["channels"] });
    },
  });

  // Pin channel
  const pinChannel = useMutation({
    mutationFn: async ({
      channelId,
      pinned,
    }: {
      channelId: string;
      pinned: boolean;
    }) => {
      if (!user) throw new Error("Non authentifie");
      const { error } = await supabase
        .from("channel_members")
        .update({ is_pinned: !pinned })
        .eq("channel_id", channelId)
        .eq("profile_id", user.id);
      if (error) throw error;
    },
    onMutate: async ({ channelId, pinned }) => {
      await queryClient.cancelQueries({ queryKey: ["channels"] });
      const previous = queryClient.getQueryData<Channel[]>(["channels"]);
      queryClient.setQueryData<Channel[]>(["channels"], (old) =>
        (old ?? []).map((c) =>
          c.id === channelId
            ? {
                ...c,
                members: c.members.map((m) =>
                  m.profile_id === user?.id ? { ...m, is_pinned: !pinned } : m,
                ),
              }
            : c,
        ),
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(["channels"], ctx.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["channels"] });
    },
  });

  // Delete channel (staff only)
  const deleteChannel = useMutation({
    mutationFn: async (channelId: string) => {
      if (!isStaff) throw new Error("Non autorise");
      // Delete members first, then channel
      const { error: membersErr } = await supabase
        .from("channel_members")
        .delete()
        .eq("channel_id", channelId);
      if (membersErr) throw membersErr;

      const { error } = await supabase
        .from("channels")
        .delete()
        .eq("id", channelId);
      if (error) throw error;
    },
    onMutate: async (channelId) => {
      await queryClient.cancelQueries({ queryKey: ["channels"] });
      const previous = queryClient.getQueryData<Channel[]>(["channels"]);
      queryClient.setQueryData<Channel[]>(["channels"], (old) =>
        (old ?? []).filter((c) => c.id !== channelId),
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(["channels"], ctx.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["channels"] });
    },
  });

  return {
    channels: allChannels,
    publicChannels,
    dmChannels,
    archivedChannels,
    isLoading: channelsQuery.isLoading,
    createChannel,
    createDMChannel,
    muteChannel,
    unmuteChannel,
    archiveChannel,
    unarchiveChannel,
    pinChannel,
    deleteChannel,
  };
}

// ─── useChannelMembers ───────────────────────────────────────

export function useChannelMembers(channelId: string | null) {
  const supabase = useMemo(() => createClient(), []);
  const queryClient = useQueryClient();
  const { user } = useUser();

  const membersQuery = useQuery({
    queryKey: ["channel-members", channelId],
    retry: 1,
    staleTime: 30_000,
    queryFn: async () => {
      if (!channelId) return [];
      const { data, error } = await supabase
        .from("channel_members")
        .select(
          `id, channel_id, profile_id, role, last_read_at, notifications_muted, is_pinned, joined_at,
          profile:profiles(id, full_name, avatar_url, role)`,
        )
        .eq("channel_id", channelId)
        .order("joined_at", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((raw): ChannelMember => {
        const m = raw as Record<string, unknown>;
        const rawProfile = m.profile;
        const profile = Array.isArray(rawProfile) ? rawProfile[0] : rawProfile;
        return {
          id: m.id as string,
          channel_id: m.channel_id as string,
          profile_id: m.profile_id as string,
          role: m.role as string,
          last_read_at: m.last_read_at as string | null,
          notifications_muted: !!(m.notifications_muted as boolean),
          is_pinned: !!(m.is_pinned as boolean),
          joined_at: m.joined_at as string,
          profile: profile && typeof profile === "object"
            ? (profile as ChannelMember["profile"])
            : undefined,
        };
      });
    },
    enabled: !!channelId,
  });

  // Add member
  const addMember = useMutation({
    mutationFn: async ({
      profileId,
      role = "member",
    }: {
      profileId: string;
      role?: string;
    }) => {
      if (!channelId) throw new Error("Pas de canal selectionne");
      const { error } = await supabase.from("channel_members").insert({
        channel_id: channelId,
        profile_id: profileId,
        role,
      });
      if (error) throw error;
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["channel-members", channelId],
      });
      queryClient.invalidateQueries({ queryKey: ["channels"] });
    },
  });

  // Remove member
  const removeMember = useMutation({
    mutationFn: async (profileId: string) => {
      if (!channelId) throw new Error("Pas de canal selectionne");
      const { error } = await supabase
        .from("channel_members")
        .delete()
        .eq("channel_id", channelId)
        .eq("profile_id", profileId);
      if (error) throw error;
    },
    onMutate: async (profileId) => {
      await queryClient.cancelQueries({
        queryKey: ["channel-members", channelId],
      });
      const previous = queryClient.getQueryData<ChannelMember[]>([
        "channel-members",
        channelId,
      ]);
      queryClient.setQueryData<ChannelMember[]>(
        ["channel-members", channelId],
        (old) => (old ?? []).filter((m) => m.profile_id !== profileId),
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous)
        queryClient.setQueryData(["channel-members", channelId], ctx.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["channel-members", channelId],
      });
      queryClient.invalidateQueries({ queryKey: ["channels"] });
    },
  });

  // Update member role
  const updateMemberRole = useMutation({
    mutationFn: async ({
      profileId,
      role,
    }: {
      profileId: string;
      role: string;
    }) => {
      if (!channelId) throw new Error("Pas de canal selectionne");
      const { error } = await supabase
        .from("channel_members")
        .update({ role })
        .eq("channel_id", channelId)
        .eq("profile_id", profileId);
      if (error) throw error;
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["channel-members", channelId],
      });
    },
  });

  // Current user's membership
  const currentMember = (membersQuery.data ?? []).find(
    (m) => m.profile_id === user?.id,
  );

  return {
    members: membersQuery.data ?? [],
    isLoading: membersQuery.isLoading,
    currentMember,
    addMember,
    removeMember,
    updateMemberRole,
  };
}
