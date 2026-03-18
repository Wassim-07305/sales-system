"use client";

import { useState, useMemo, useCallback } from "react";
import { MessageSquare, Inbox, Menu, X } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { useUser } from "@/lib/hooks/use-user";
import { useMessagingStore } from "@/stores/messaging-store";
import { ChannelSidebar } from "./channel-sidebar";
import { ChatPanel } from "./chat-panel";
import { CreateChannelModal } from "./create-channel-modal";
import { ChannelSettingsModal } from "./channel-settings-modal";
import { UnifiedInbox } from "./unified-inbox";
import type { ChannelWithMeta } from "@/lib/types/messaging";

type ViewMode = "messaging" | "inbox";

export function MessagingContainer() {
  const supabase = useMemo(() => createClient(), []);
  const queryClient = useQueryClient();
  const { user } = useUser();

  const {
    activeChannelId,
    setActiveChannelId,
    mobileSidebarOpen,
    setMobileSidebarOpen,
  } = useMessagingStore();

  const [viewMode, setViewMode] = useState<ViewMode>("messaging");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Fetch channels
  const { data: channels = [], isLoading: channelsLoading } = useQuery({
    queryKey: ["channels"],
    queryFn: async () => {
      if (!user) return [];

      // Get channels where user is a member
      const { data: memberships, error: memberError } = await supabase
        .from("channel_members")
        .select("channel_id, is_muted, is_pinned, last_read_at")
        .eq("profile_id", user.id);

      if (memberError) throw memberError;
      if (!memberships?.length) return [];

      const channelIds = memberships.map((m) => m.channel_id);

      const { data: channelsData, error: channelsError } = await supabase
        .from("channels")
        .select("*")
        .in("id", channelIds)
        .order("last_message_at", { ascending: false, nullsFirst: false });

      if (channelsError) throw channelsError;

      // Get unread counts
      const enriched: ChannelWithMeta[] = await Promise.all(
        (channelsData ?? []).map(async (ch) => {
          const membership = memberships.find((m) => m.channel_id === ch.id);

          // Unread count
          let unreadCount = 0;
          let urgentUnreadCount = 0;
          if (membership?.last_read_at) {
            const { count } = await supabase
              .from("messages")
              .select("*", { count: "exact", head: true })
              .eq("channel_id", ch.id)
              .gt("created_at", membership.last_read_at)
              .is("deleted_at", null);
            unreadCount = count ?? 0;

            const { count: urgentCount } = await supabase
              .from("messages")
              .select("*", { count: "exact", head: true })
              .eq("channel_id", ch.id)
              .eq("is_urgent", true)
              .gt("created_at", membership.last_read_at)
              .is("deleted_at", null);
            urgentUnreadCount = urgentCount ?? 0;
          }

          // DM partner
          let dmPartner: ChannelWithMeta["dmPartner"] = null;
          if (ch.type === "direct") {
            const { data: otherMembers } = await supabase
              .from("channel_members")
              .select(
                "profile:profiles!profile_id(id, full_name, avatar_url, role)",
              )
              .eq("channel_id", ch.id)
              .neq("profile_id", user.id)
              .limit(1);

            if (otherMembers?.[0]) {
              const profile = otherMembers[0].profile as unknown as {
                id: string;
                full_name: string;
                avatar_url: string | null;
                role: string;
              };
              dmPartner = profile;
            }
          }

          return {
            ...ch,
            unreadCount,
            urgentUnreadCount,
            isMuted: membership?.is_muted ?? false,
            isPinned: membership?.is_pinned ?? false,
            myLastRead: membership?.last_read_at ?? null,
            dmPartner,
          };
        }),
      );

      return enriched;
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  // Get active channel
  const activeChannel = useMemo(
    () => channels.find((c) => c.id === activeChannelId) ?? null,
    [channels, activeChannelId],
  );

  // Get member count for active channel
  const { data: memberCount = 0 } = useQuery({
    queryKey: ["channel-member-count", activeChannelId],
    queryFn: async () => {
      if (!activeChannelId) return 0;
      const { count, error } = await supabase
        .from("channel_members")
        .select("*", { count: "exact", head: true })
        .eq("channel_id", activeChannelId);
      if (error) return 0;
      return count ?? 0;
    },
    enabled: !!activeChannelId,
  });

  // Create channel mutation
  const createChannel = useMutation({
    mutationFn: async (data: {
      name: string;
      type: "group" | "direct";
      description: string;
      memberIds: string[];
    }) => {
      if (!user) throw new Error("Not authenticated");

      const { data: channel, error } = await supabase
        .from("channels")
        .insert({
          name: data.name,
          type: data.type,
          description: data.description || null,
          created_by: user.id,
        })
        .select("id")
        .single();

      if (error) throw error;

      // Add creator + members
      const allMemberIds = [user.id, ...data.memberIds];
      const memberInserts = allMemberIds.map((profileId) => ({
        channel_id: channel.id,
        profile_id: profileId,
        role: profileId === user.id ? "owner" : "member",
      }));

      const { error: memberError } = await supabase
        .from("channel_members")
        .insert(memberInserts);

      if (memberError) throw memberError;

      return channel;
    },
    onSuccess: (channel) => {
      queryClient.invalidateQueries({ queryKey: ["channels"] });
      setActiveChannelId(channel.id);
      setShowCreateModal(false);
    },
  });

  // Update channel
  const updateChannel = useMutation({
    mutationFn: async (data: { name?: string; description?: string }) => {
      if (!activeChannelId) throw new Error("No channel selected");
      const { error } = await supabase
        .from("channels")
        .update(data)
        .eq("id", activeChannelId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["channels"] });
    },
  });

  // Delete channel
  const handleDeleteChannel = useCallback(async () => {
    if (!activeChannelId) return;
    await supabase.from("channels").delete().eq("id", activeChannelId);
    setActiveChannelId(null);
    setShowSettingsModal(false);
    queryClient.invalidateQueries({ queryKey: ["channels"] });
  }, [activeChannelId, supabase, setActiveChannelId, queryClient]);

  // Leave channel
  const handleLeaveChannel = useCallback(async () => {
    if (!activeChannelId || !user) return;
    await supabase
      .from("channel_members")
      .delete()
      .eq("channel_id", activeChannelId)
      .eq("profile_id", user.id);
    setActiveChannelId(null);
    setShowSettingsModal(false);
    queryClient.invalidateQueries({ queryKey: ["channels"] });
  }, [activeChannelId, user, supabase, setActiveChannelId, queryClient]);

  // Add member
  const handleAddMember = useCallback(
    async (profileId: string) => {
      if (!activeChannelId) return;
      await supabase.from("channel_members").insert({
        channel_id: activeChannelId,
        profile_id: profileId,
        role: "member",
      });
      queryClient.invalidateQueries({
        queryKey: ["channel-members", activeChannelId],
      });
    },
    [activeChannelId, supabase, queryClient],
  );

  // Remove member
  const handleRemoveMember = useCallback(
    async (profileId: string) => {
      if (!activeChannelId) return;
      await supabase
        .from("channel_members")
        .delete()
        .eq("channel_id", activeChannelId)
        .eq("profile_id", profileId);
      queryClient.invalidateQueries({
        queryKey: ["channel-members", activeChannelId],
      });
    },
    [activeChannelId, supabase, queryClient],
  );

  // Auto-select first channel
  if (!activeChannelId && channels.length > 0 && !channelsLoading) {
    setActiveChannelId(channels[0].id);
  }

  return (
    <div className="flex h-full flex-col">
      {/* Top toggle bar */}
      <div className="flex items-center justify-between border-b px-4 py-2 bg-background">
        <div className="flex items-center gap-2">
          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            className="rounded-lg p-2 hover:bg-muted transition-colors md:hidden"
          >
            {mobileSidebarOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>

          {/* View mode toggle */}
          <div className="flex items-center rounded-lg border bg-muted/30 p-0.5">
            <button
              onClick={() => setViewMode("messaging")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                viewMode === "messaging"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Sales System
            </button>
            <button
              onClick={() => setViewMode("inbox")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                viewMode === "inbox"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Inbox className="h-3.5 w-3.5" />
              Boite unifiee
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {viewMode === "messaging" ? (
          <>
            {/* Sidebar - desktop */}
            <div className="hidden md:block">
              <ChannelSidebar
                channels={channels}
                isLoading={channelsLoading}
                onCreateChannel={() => setShowCreateModal(true)}
              />
            </div>

            {/* Sidebar - mobile overlay */}
            {mobileSidebarOpen && (
              <div className="fixed inset-0 z-40 md:hidden">
                <div
                  className="absolute inset-0 bg-black/50"
                  onClick={() => setMobileSidebarOpen(false)}
                />
                <div className="relative h-full w-72 bg-background shadow-xl">
                  <ChannelSidebar
                    channels={channels}
                    isLoading={channelsLoading}
                    onCreateChannel={() => setShowCreateModal(true)}
                  />
                </div>
              </div>
            )}

            {/* Chat panel */}
            {activeChannel ? (
              <ChatPanel
                channel={activeChannel}
                memberCount={memberCount}
                onOpenSettings={() => setShowSettingsModal(true)}
                onBack={() => setMobileSidebarOpen(true)}
              />
            ) : (
              <div className="flex flex-1 items-center justify-center">
                <div className="text-center">
                  <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                    <MessageSquare className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="text-sm font-semibold">
                    Selectionnez une conversation
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Choisissez un canal dans la barre laterale
                  </p>
                </div>
              </div>
            )}
          </>
        ) : (
          <UnifiedInbox />
        )}
      </div>

      {/* Modals */}
      <CreateChannelModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={(data) => createChannel.mutate(data)}
        isCreating={createChannel.isPending}
      />

      {activeChannel && (
        <ChannelSettingsModal
          channel={activeChannel}
          open={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          onUpdateChannel={(data) => updateChannel.mutate(data)}
          onDeleteChannel={handleDeleteChannel}
          onLeaveChannel={handleLeaveChannel}
          onAddMember={handleAddMember}
          onRemoveMember={handleRemoveMember}
          isUpdating={updateChannel.isPending}
        />
      )}
    </div>
  );
}
