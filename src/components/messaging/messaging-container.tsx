"use client";

import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { MessageSquare, Inbox, Menu, X } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/hooks/use-user";
import { useChannels, useChannelMembers } from "@/lib/hooks/use-channels";
import { useUnreadCounts } from "@/lib/hooks/use-unread-counts";
import { useMessagingStore } from "@/stores/messaging-store";
import { ChannelSidebar } from "./channel-sidebar";
import { ChatPanel } from "./chat-panel";
import { AiChatPanel } from "./ai-chat-panel";
import { CreateChannelModal } from "./create-channel-modal";
import { ChannelSettingsModal } from "./channel-settings-modal";
import { UnifiedInbox } from "./unified-inbox";
import { QuickSwitcher } from "./quick-switcher";
import { ensureDefaultChannels } from "@/lib/actions/communication";
import type { ChannelWithMeta } from "@/lib/types/messaging";

/** Micro error boundary to isolate which section crashes */
class SectionBoundary extends React.Component<
  { name: string; children: React.ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[SectionBoundary:${this.props.name}] CRASH:`, error.message);
    console.error(`[SectionBoundary:${this.props.name}] Stack:`, info.componentStack);
  }
  render() {
    if (this.state.error) {
      return (
        <div className="p-2 text-xs text-destructive bg-destructive/10 rounded m-1">
          <strong>Crash in: {this.props.name}</strong>
          <br />
          {this.state.error.message}
        </div>
      );
    }
    return this.props.children;
  }
}

const AI_AGENT_ID = "__ai_agent__";

type ViewMode = "messaging" | "inbox";

/** Coerce any value to a safe string to prevent React #310 */
function safeStr(val: unknown): string {
  if (val == null) return "";
  if (typeof val === "string") return val;
  if (typeof val === "number" || typeof val === "boolean") return String(val);
  try { return JSON.stringify(val); } catch { return "[object]"; }
}

/** Safely unwrap a Supabase FK join that may return an array instead of object */
function unwrapProfile(
  raw: unknown,
): { id: string; full_name: string; avatar_url: string | null; role: string } | null {
  if (!raw) return null;
  const obj = Array.isArray(raw) ? raw[0] : raw;
  if (!obj || typeof obj !== "object") return null;
  const p = obj as Record<string, unknown>;
  return {
    id: safeStr(p.id),
    full_name: safeStr(p.full_name) || "Inconnu",
    avatar_url: typeof p.avatar_url === "string" ? p.avatar_url : null,
    role: safeStr(p.role),
  };
}

/** Enrichit les channels bruts du hook en ChannelWithMeta pour les composants enfants */
function useEnrichedChannels(
  channels: ReturnType<typeof useChannels>["channels"],
  userId: string | undefined,
  unreadMap: Record<string, { unread: number; urgent: number }>,
): ChannelWithMeta[] {
  return useMemo(() => {
    if (!userId) return [];

    return channels.map((ch) => {
      // Guard: if members is UUID[] from the column instead of the join, skip
      const members = Array.isArray(ch.members)
        ? ch.members.filter((m): m is NonNullable<typeof m> => typeof m === "object" && m !== null)
        : [];
      const myMembership = members.find((m) => m.profile_id === userId);
      const isDM = ch.type === "direct" || ch.type === "dm";
      const dmPartnerMember = isDM
        ? members.find((m) => m.profile_id !== userId)
        : null;
      const counts = unreadMap[ch.id];

      return {
        id: safeStr(ch.id),
        name: safeStr(ch.name) || "Sans nom",
        type: safeStr(ch.type),
        description: ch.description == null ? null : safeStr(ch.description),
        created_by: ch.created_by,
        created_at: ch.created_at,
        is_archived: !!ch.is_archived,
        last_message_at: ch.last_message_at ?? ch.created_at,
        unreadCount: counts?.unread ?? 0,
        urgentUnreadCount: counts?.urgent ?? 0,
        isMuted: !!myMembership?.notifications_muted,
        isPinned: !!myMembership?.is_pinned,
        myLastRead: myMembership?.last_read_at ?? null,
        dmPartner: unwrapProfile(dmPartnerMember?.profile),
      };
    });
  }, [channels, userId, unreadMap]);
}

export function MessagingContainer() {
  const supabase = useMemo(() => createClient(), []);
  const queryClient = useQueryClient();
  const { user } = useUser();
  const {
    publicChannels: rawPublic,
    dmChannels: rawDm,
    archivedChannels: rawArchived,
    isLoading,
    createChannel,
    createDMChannel,
    deleteChannel,
  } = useChannels();

  const {
    activeChannelId,
    setActiveChannelId,
    mobileSidebarOpen,
    setMobileSidebarOpen,
  } = useMessagingStore();

  const { unreadMap } = useUnreadCounts();

  const [viewMode, setViewMode] = useState<ViewMode>("messaging");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showQuickSwitcher, setShowQuickSwitcher] = useState(false);

  // Enrichir les channels pour les composants qui attendent ChannelWithMeta
  const publicChannels = useEnrichedChannels(rawPublic, user?.id, unreadMap);
  const dmChannels = useEnrichedChannels(rawDm, user?.id, unreadMap);
  const archivedChannels = useEnrichedChannels(
    rawArchived,
    user?.id,
    unreadMap,
  );
  const allEnriched = useMemo(
    () => [...publicChannels, ...dmChannels, ...archivedChannels],
    [publicChannels, dmChannels, archivedChannels],
  );

  // Channel actif + membres
  const activeChannel = useMemo(
    () => allEnriched.find((c) => c.id === activeChannelId) ?? null,
    [allEnriched, activeChannelId],
  );

  const { members, addMember, removeMember } =
    useChannelMembers(activeChannelId);
  const memberCount = members.length;

  // Ensure "Canal Général" exists on first load
  const defaultChannelsEnsured = useRef(false);
  useEffect(() => {
    if (user && !defaultChannelsEnsured.current) {
      defaultChannelsEnsured.current = true;
      ensureDefaultChannels()
        .then((result) => {
          if (result.channelId) {
            queryClient.invalidateQueries({ queryKey: ["channels"] });
          }
        })
        .catch((err) => {
          console.error("[MessagingContainer] ensureDefaultChannels failed:", err);
        });
    }
  }, [user, queryClient]);

  // Cmd+K to open quick switcher (listener lives here since QuickSwitcher is conditionally rendered)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setShowQuickSwitcher((prev) => !prev);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Auto-selection du premier canal
  useEffect(() => {
    if (!activeChannelId && publicChannels.length > 0) {
      setActiveChannelId(publicChannels[0].id);
    } else if (!activeChannelId && dmChannels.length > 0) {
      setActiveChannelId(dmChannels[0].id);
    }
  }, [activeChannelId, publicChannels, dmChannels, setActiveChannelId]);

  const isAiAgent = activeChannelId === AI_AGENT_ID;

  // Handlers
  const handleCreateChannel = useCallback(
    (data: {
      name: string;
      type: "group" | "direct";
      description: string;
      memberIds: string[];
    }) => {
      createChannel.mutate(
        {
          name: data.name,
          type: data.type,
          description: data.description,
          memberIds: data.memberIds,
        },
        {
          onSuccess: (channel) => {
            setActiveChannelId(channel.id);
            setShowCreateModal(false);
          },
        },
      );
    },
    [createChannel, setActiveChannelId],
  );

  const handleCreateDM = useCallback(
    (userId: string) => {
      createDMChannel.mutate(
        { targetUserId: userId },
        {
          onSuccess: (channel) => {
            setActiveChannelId(channel.id);
            queryClient.invalidateQueries({ queryKey: ["all-profiles-dm"] });
          },
        },
      );
    },
    [createDMChannel, setActiveChannelId, queryClient],
  );

  // Mise à jour du canal (nom/description)
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

  const handleDeleteChannel = useCallback(() => {
    if (!activeChannelId) return;
    deleteChannel.mutate(activeChannelId, {
      onSuccess: () => {
        setActiveChannelId(null);
        setShowSettingsModal(false);
      },
    });
  }, [activeChannelId, deleteChannel, setActiveChannelId]);

  const handleLeaveChannel = useCallback(() => {
    if (!activeChannelId || !user) return;
    removeMember.mutate(user.id, {
      onSuccess: () => {
        setActiveChannelId(null);
        setShowSettingsModal(false);
      },
    });
  }, [activeChannelId, user, removeMember, setActiveChannelId]);

  // Rendu sidebar (réutilisé pour desktop et mobile)
  const sidebarContent = (
    <ChannelSidebar
      publicChannels={publicChannels}
      dmChannels={dmChannels}
      archivedChannels={archivedChannels}
      isLoading={isLoading}
      onCreateChannel={() => setShowCreateModal(true)}
      onCreateDM={handleCreateDM}
      onSelectChannel={(id) => {
        setActiveChannelId(id);
        setMobileSidebarOpen(false);
      }}
      aiAgentId={AI_AGENT_ID}
    />
  );

  return (
    <div className="flex h-[calc(100dvh-4rem)] flex-col">
      {/* Toggle Messagerie / Boîte unifiée */}
      <SectionBoundary name="ToggleBar">
      <div className="flex items-center justify-between border-b px-4 py-2 bg-background">
        <div className="flex items-center gap-2">
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

          <div className="backdrop-blur-sm rounded-xl bg-muted/40 border border-border/50 p-1 flex items-center">
            <button
              onClick={() => setViewMode("messaging")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-all",
                viewMode === "messaging"
                  ? "bg-background text-foreground shadow-sm rounded-lg"
                  : "text-muted-foreground hover:text-foreground rounded-lg",
              )}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Sales System
            </button>
            <button
              onClick={() => setViewMode("inbox")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-all",
                viewMode === "inbox"
                  ? "bg-background text-foreground shadow-sm rounded-lg"
                  : "text-muted-foreground hover:text-foreground rounded-lg",
              )}
            >
              <Inbox className="h-3.5 w-3.5" />
              Boîte unifiée
            </button>
          </div>
        </div>
      </div>
      </SectionBoundary>

      {/* Contenu principal */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {viewMode === "messaging" ? (
          <>
            {/* Sidebar desktop */}
            <SectionBoundary name="Sidebar">
            <div className="hidden md:block">{sidebarContent}</div>
            </SectionBoundary>

            {/* Sidebar mobile overlay */}
            {mobileSidebarOpen && (
              <div className="fixed inset-0 z-40 md:hidden">
                <div
                  className="absolute inset-0 bg-black/50"
                  onClick={() => setMobileSidebarOpen(false)}
                />
                <div className="relative h-full w-72 bg-background shadow-xl">
                  {sidebarContent}
                </div>
              </div>
            )}

            {/* Chat ou placeholder */}
            <SectionBoundary name="ChatArea">
            {isAiAgent ? (
              <AiChatPanel onBack={() => setMobileSidebarOpen(true)} />
            ) : activeChannel ? (
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
                    Sélectionnez une conversation
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Choisissez un canal dans la barre latérale
                  </p>
                </div>
              </div>
            )}
            </SectionBoundary>
          </>
        ) : (
          <SectionBoundary name="UnifiedInbox">
          <div className="flex-1 min-w-0 min-h-0 overflow-hidden">
            <UnifiedInbox />
          </div>
          </SectionBoundary>
        )}
      </div>

      {/* Quick Switcher (Cmd+K) — only mount when open to avoid rendering objects */}
      {showQuickSwitcher && (
        <SectionBoundary name="QuickSwitcher">
        <QuickSwitcher
          open={showQuickSwitcher}
          onOpenChange={setShowQuickSwitcher}
          publicChannels={publicChannels}
          dmChannels={dmChannels}
          archivedChannels={archivedChannels}
          onSelectChannel={(id) => {
            setActiveChannelId(id);
            setMobileSidebarOpen(false);
            setViewMode("messaging");
          }}
          aiAgentId={AI_AGENT_ID}
        />
        </SectionBoundary>
      )}

      {/* Modales */}
      <SectionBoundary name="CreateModal">
      <CreateChannelModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateChannel}
        isCreating={createChannel.isPending}
      />
      </SectionBoundary>

      {activeChannel && (
        <SectionBoundary name="SettingsModal">
        <ChannelSettingsModal
          channel={activeChannel}
          open={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          onUpdateChannel={(data) => updateChannel.mutate(data)}
          onDeleteChannel={handleDeleteChannel}
          onLeaveChannel={handleLeaveChannel}
          onAddMember={(profileId) => addMember.mutate({ profileId })}
          onRemoveMember={(profileId) => removeMember.mutate(profileId)}
          isUpdating={updateChannel.isPending}
        />
        </SectionBoundary>
      )}
    </div>
  );
}
