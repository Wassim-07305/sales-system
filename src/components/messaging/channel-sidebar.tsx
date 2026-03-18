"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import {
  Hash,
  Megaphone,
  Plus,
  Search,
  ChevronDown,
  ChevronRight,
  BellOff,
  Pin,
  MessageSquare,
  LayoutGrid,
  List,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useUser } from "@/lib/hooks/use-user";
import { useMessagingStore } from "@/stores/messaging-store";
import type { ChannelWithMeta } from "@/lib/types/messaging";

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const STAFF_ROLES = ["admin", "manager"];

interface ChannelSidebarProps {
  channels: ChannelWithMeta[];
  isLoading: boolean;
  onCreateChannel: () => void;
}

export function ChannelSidebar({
  channels,
  isLoading,
  onCreateChannel,
}: ChannelSidebarProps) {
  const supabase = useMemo(() => createClient(), []);
  const queryClient = useQueryClient();
  const { user, profile } = useUser();
  const { activeChannelId, setActiveChannelId, setMobileSidebarOpen } =
    useMessagingStore();

  const [search, setSearch] = useState("");
  const [channelsOpen, setChannelsOpen] = useState(true);
  const [dmsOpen, setDmsOpen] = useState(true);
  const [viewMode, setViewMode] = useState<"list" | "mosaic">("list");

  const isStaff = profile ? STAFF_ROLES.includes(profile.role) : false;

  // Fetch all profiles for DM section
  const { data: allProfiles } = useQuery({
    queryKey: ["all-profiles-dm"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, role")
        .neq("id", user?.id ?? "")
        .order("full_name");
      return (data ?? []) as Array<{
        id: string;
        full_name: string;
        avatar_url: string | null;
        role: string;
      }>;
    },
    enabled: !!user,
  });

  // Separate channel types
  const groupChannels = useMemo(
    () =>
      channels.filter(
        (c) =>
          (c.type === "group" || c.type === "announcement") && !c.is_archived,
      ),
    [channels],
  );

  const dmChannels = useMemo(
    () => channels.filter((c) => c.type === "direct" && !c.is_archived),
    [channels],
  );

  // IDs of users who already have a DM
  const dmPartnerIds = useMemo(() => {
    return new Set(dmChannels.map((ch) => ch.dmPartner?.id).filter(Boolean));
  }, [dmChannels]);

  // Users without existing DM conversation
  const usersWithoutDM = useMemo(() => {
    return (allProfiles ?? []).filter((p) => !dmPartnerIds.has(p.id));
  }, [allProfiles, dmPartnerIds]);

  // Search filter
  const filteredGroupChannels = useMemo(() => {
    if (!search.trim()) return groupChannels;
    const q = search.toLowerCase();
    return groupChannels.filter((c) => c.name.toLowerCase().includes(q));
  }, [groupChannels, search]);

  const filteredDmChannels = useMemo(() => {
    const sorted = [...dmChannels].sort(
      (a, b) => Number(b.isPinned) - Number(a.isPinned),
    );
    if (!search.trim()) return sorted;
    const q = search.toLowerCase();
    return sorted.filter((ch) =>
      ch.dmPartner?.full_name?.toLowerCase().includes(q),
    );
  }, [dmChannels, search]);

  const filteredUsersWithoutDM = useMemo(() => {
    if (!search.trim()) return usersWithoutDM;
    const q = search.toLowerCase();
    return usersWithoutDM.filter((p) => p.full_name.toLowerCase().includes(q));
  }, [usersWithoutDM, search]);

  // Create DM channel
  const createDM = useMutation({
    mutationFn: async (otherUserId: string) => {
      if (!user) throw new Error("Not authenticated");

      // Check if DM already exists
      const { data: myChannels } = await supabase
        .from("channel_members")
        .select("channel_id")
        .eq("profile_id", user.id);

      const myIds = (myChannels ?? []).map((c) => c.channel_id);

      if (myIds.length > 0) {
        const { data: otherMemberships } = await supabase
          .from("channel_members")
          .select("channel_id")
          .eq("profile_id", otherUserId)
          .in("channel_id", myIds);

        const sharedIds = (otherMemberships ?? []).map((c) => c.channel_id);

        if (sharedIds.length > 0) {
          const { data: existingDM } = await supabase
            .from("channels")
            .select("*")
            .eq("type", "direct")
            .in("id", sharedIds)
            .maybeSingle();

          if (existingDM) return existingDM;
        }
      }

      // Get names
      const { data: otherProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", otherUserId)
        .single();

      const dmName = `${profile?.full_name ?? "?"} & ${otherProfile?.full_name ?? "?"}`;

      const { data: channel, error } = await supabase
        .from("channels")
        .insert({
          name: dmName,
          type: "direct",
          created_by: user.id,
          members: [user.id, otherUserId],
        })
        .select()
        .single();
      if (error) throw error;

      await supabase.from("channel_members").insert([
        { channel_id: channel.id, profile_id: user.id, role: "admin" },
        { channel_id: channel.id, profile_id: otherUserId, role: "member" },
      ]);

      return channel;
    },
    onSuccess: (channel) => {
      queryClient.invalidateQueries({ queryKey: ["channels"] });
      queryClient.invalidateQueries({ queryKey: ["all-profiles-dm"] });
      setActiveChannelId(channel.id);
      setMobileSidebarOpen(false);
    },
  });

  const handleSelectChannel = (channelId: string) => {
    setActiveChannelId(channelId);
    setMobileSidebarOpen(false);
  };

  const ROLE_LABELS: Record<string, string> = {
    admin: "Admin",
    manager: "Manager",
    setter: "Setter",
    closer: "Closer",
    client_b2b: "Client B2B",
    client_b2c: "Client B2C",
  };

  return (
    <div className="flex h-full w-72 flex-col border-r bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <MessageSquare className="w-3.5 h-3.5 text-primary" />
          </div>
          <h2 className="text-sm font-bold">Messagerie</h2>
        </div>
        {isStaff && (
          <button
            onClick={onCreateChannel}
            className="rounded-lg p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Nouveau canal"
          >
            <Plus className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Search */}
      <div className="px-3 py-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher..."
            className="w-full h-8 pl-8 pr-3 bg-muted/50 border border-border/40 rounded-lg text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/15 transition-all"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {isLoading ? (
          <div className="space-y-2 px-3 py-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : (
          <>
            {/* ── Canaux ── */}
            <div className="mb-1">
              <button
                onClick={() => setChannelsOpen(!channelsOpen)}
                className="w-full flex items-center justify-between px-4 py-1.5 text-[11px] font-bold text-primary/70 uppercase tracking-wider hover:text-primary transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  {channelsOpen ? (
                    <ChevronDown className="w-3 h-3" />
                  ) : (
                    <ChevronRight className="w-3 h-3" />
                  )}
                  Canaux
                </div>
                <span className="text-[10px] font-normal text-muted-foreground">
                  {filteredGroupChannels.length}
                </span>
              </button>

              {channelsOpen && (
                <div className="px-2 space-y-0.5">
                  {filteredGroupChannels.map((ch) => {
                    const isActive = ch.id === activeChannelId;
                    const isAnnouncement = ch.type === "announcement";
                    return (
                      <button
                        key={ch.id}
                        onClick={() => handleSelectChannel(ch.id)}
                        className={cn(
                          "w-full flex items-center gap-2.5 px-2.5 h-9 rounded-lg text-[13px] transition-all",
                          isActive
                            ? "bg-primary/10 text-primary font-semibold"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
                          ch.isMuted && !isActive && "opacity-40",
                        )}
                      >
                        <div
                          className={cn(
                            "w-6 h-6 rounded-lg flex items-center justify-center shrink-0",
                            isActive ? "bg-primary/15" : "bg-muted/60",
                          )}
                        >
                          {isAnnouncement ? (
                            <Megaphone
                              className={cn(
                                "w-3.5 h-3.5",
                                isActive
                                  ? "text-primary"
                                  : "text-muted-foreground/70",
                              )}
                            />
                          ) : (
                            <Hash
                              className={cn(
                                "w-3.5 h-3.5",
                                isActive
                                  ? "text-primary"
                                  : "text-muted-foreground/70",
                              )}
                            />
                          )}
                        </div>
                        <span className="truncate flex-1 text-left">
                          {ch.name}
                        </span>
                        {ch.isPinned && (
                          <Pin className="w-3 h-3 text-muted-foreground/50 shrink-0 rotate-45" />
                        )}
                        {ch.isMuted && (
                          <BellOff className="w-3 h-3 text-muted-foreground/40 shrink-0" />
                        )}
                        {ch.unreadCount > 0 && !ch.isMuted && (
                          <Badge
                            variant={
                              ch.urgentUnreadCount > 0
                                ? "destructive"
                                : "default"
                            }
                            className="h-[18px] min-w-[18px] px-1.5 text-[10px]"
                          >
                            {ch.unreadCount > 99 ? "99+" : ch.unreadCount}
                          </Badge>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── Messages directs ── */}
            <div className="mt-3">
              <div className="w-full flex items-center justify-between px-4 py-1.5">
                <button
                  onClick={() => setDmsOpen(!dmsOpen)}
                  className="flex items-center gap-1.5 text-[11px] font-bold text-primary/70 uppercase tracking-wider hover:text-primary transition-colors"
                >
                  {dmsOpen ? (
                    <ChevronDown className="w-3 h-3" />
                  ) : (
                    <ChevronRight className="w-3 h-3" />
                  )}
                  Messages directs
                </button>
                <button
                  onClick={() =>
                    setViewMode(viewMode === "list" ? "mosaic" : "list")
                  }
                  className="w-5 h-5 rounded-md flex items-center justify-center hover:bg-primary/10 text-primary/50 hover:text-primary transition-all"
                  title={viewMode === "list" ? "Vue mosaique" : "Vue liste"}
                >
                  {viewMode === "list" ? (
                    <LayoutGrid className="w-3.5 h-3.5" />
                  ) : (
                    <List className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              {dmsOpen && (
                <>
                  {viewMode === "mosaic" ? (
                    <div className="px-2 grid grid-cols-3 gap-2">
                      {/* Existing DMs */}
                      {filteredDmChannels.map((ch) => {
                        const isActive = ch.id === activeChannelId;
                        const partner = ch.dmPartner;
                        return (
                          <button
                            key={ch.id}
                            onClick={() => handleSelectChannel(ch.id)}
                            className={cn(
                              "flex flex-col items-center gap-1.5 p-2.5 rounded-xl text-[11px] transition-all",
                              isActive
                                ? "bg-primary/10 text-primary font-semibold ring-1 ring-primary/15"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
                            )}
                          >
                            <Avatar className="h-10 w-10">
                              <AvatarImage
                                src={partner?.avatar_url ?? undefined}
                              />
                              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                {partner ? getInitials(partner.full_name) : "?"}
                              </AvatarFallback>
                            </Avatar>
                            {ch.unreadCount > 0 && (
                              <Badge className="h-4 min-w-4 px-1 text-[9px]">
                                {ch.unreadCount}
                              </Badge>
                            )}
                            <span className="truncate w-full text-center leading-tight font-medium">
                              {partner?.full_name?.split(" ")[0] ?? ch.name}
                            </span>
                          </button>
                        );
                      })}

                      {/* Users without DM */}
                      {filteredUsersWithoutDM.map((p) => (
                        <button
                          key={`new-dm-${p.id}`}
                          onClick={() => createDM.mutate(p.id)}
                          className="flex flex-col items-center gap-1 p-2 rounded-xl text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all"
                        >
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={p.avatar_url ?? undefined} />
                            <AvatarFallback className="bg-muted text-xs">
                              {getInitials(p.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="truncate w-full text-center leading-tight">
                            {p.full_name.split(" ")[0]}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="px-2 space-y-0.5">
                      {/* Existing DMs */}
                      {filteredDmChannels.map((ch) => {
                        const isActive = ch.id === activeChannelId;
                        const partner = ch.dmPartner;
                        return (
                          <button
                            key={ch.id}
                            onClick={() => handleSelectChannel(ch.id)}
                            className={cn(
                              "w-full flex items-center gap-2.5 px-2.5 h-10 rounded-lg text-[13px] transition-all",
                              isActive
                                ? "bg-primary/10 text-primary font-semibold"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
                            )}
                          >
                            <Avatar className="h-7 w-7 shrink-0">
                              <AvatarImage
                                src={partner?.avatar_url ?? undefined}
                              />
                              <AvatarFallback
                                className={cn(
                                  "text-[10px] font-semibold",
                                  isActive
                                    ? "bg-primary/10 text-primary"
                                    : "bg-muted",
                                )}
                              >
                                {partner ? getInitials(partner.full_name) : "?"}
                              </AvatarFallback>
                            </Avatar>
                            <span className="truncate flex-1 text-left">
                              {partner?.full_name ?? ch.name}
                            </span>
                            {ch.isMuted && (
                              <BellOff className="w-3 h-3 text-muted-foreground/40 shrink-0" />
                            )}
                            {ch.unreadCount > 0 && !ch.isMuted && (
                              <Badge className="h-[18px] min-w-[18px] px-1.5 text-[10px]">
                                {ch.unreadCount > 99 ? "99+" : ch.unreadCount}
                              </Badge>
                            )}
                          </button>
                        );
                      })}

                      {/* Users without DM — shown directly */}
                      {filteredUsersWithoutDM.map((p) => (
                        <button
                          key={`new-dm-${p.id}`}
                          onClick={() => createDM.mutate(p.id)}
                          disabled={createDM.isPending}
                          className="w-full flex items-center gap-2.5 px-2.5 h-9 rounded-lg text-[13px] text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all disabled:opacity-50"
                        >
                          <Avatar className="h-6 w-6 shrink-0">
                            <AvatarImage src={p.avatar_url ?? undefined} />
                            <AvatarFallback className="bg-muted text-[10px]">
                              {getInitials(p.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="truncate flex-1 text-left">
                            {p.full_name}
                          </span>
                          <span className="text-[10px] text-muted-foreground/60 capitalize">
                            {ROLE_LABELS[p.role] ?? p.role}
                          </span>
                        </button>
                      ))}

                      {filteredDmChannels.length === 0 &&
                        filteredUsersWithoutDM.length === 0 && (
                          <p className="text-xs text-muted-foreground px-2.5 py-2">
                            Aucun resultat
                          </p>
                        )}
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
