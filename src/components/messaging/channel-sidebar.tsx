"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
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
  Archive,
  Bot,
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

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  manager: "Manager",
  setter: "Setter",
  closer: "Closer",
  client_b2b: "Client B2B",
  client_b2c: "Client B2C",
};

interface ChannelSidebarProps {
  publicChannels: ChannelWithMeta[];
  dmChannels: ChannelWithMeta[];
  archivedChannels: ChannelWithMeta[];
  isLoading: boolean;
  onCreateChannel: () => void;
  onCreateDM: (userId: string) => void;
  onSelectChannel: (channelId: string) => void;
  aiAgentId?: string;
}

export function ChannelSidebar({
  publicChannels,
  dmChannels,
  archivedChannels,
  isLoading,
  onCreateChannel,
  onCreateDM,
  onSelectChannel,
  aiAgentId,
}: ChannelSidebarProps) {
  const supabase = useMemo(() => createClient(), []);
  const { user, profile } = useUser();
  const { activeChannelId } = useMessagingStore();

  const [search, setSearch] = useState("");
  const [channelsOpen, setChannelsOpen] = useState(true);
  const [dmsOpen, setDmsOpen] = useState(true);
  const [archivesOpen, setArchivesOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "mosaic">("list");

  const isStaff = profile ? STAFF_ROLES.includes(profile.role) : false;

  // Profils pour la section DM (utilisateurs sans conversation)
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

  // IDs des partenaires DM existants
  const dmPartnerIds = useMemo(
    () => new Set(dmChannels.map((ch) => ch.dmPartner?.id).filter(Boolean)),
    [dmChannels],
  );

  const usersWithoutDM = useMemo(
    () => (allProfiles ?? []).filter((p) => !dmPartnerIds.has(p.id)),
    [allProfiles, dmPartnerIds],
  );

  // Filtrage par recherche
  const filteredPublicChannels = useMemo(() => {
    if (!search.trim()) return publicChannels;
    const q = search.toLowerCase();
    return publicChannels.filter((c) => c.name.toLowerCase().includes(q));
  }, [publicChannels, search]);

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

  const filteredArchivedChannels = useMemo(() => {
    if (!search.trim()) return archivedChannels;
    const q = search.toLowerCase();
    return archivedChannels.filter((c) => c.name.toLowerCase().includes(q));
  }, [archivedChannels, search]);

  // Etat de creation DM en cours — reset quand la liste DM change
  const [creatingDMFor, setCreatingDMFor] = useState<string | null>(null);
  useEffect(() => {
    setCreatingDMFor(null);
  }, [dmChannels.length]);

  const handleDMClick = (userId: string) => {
    if (creatingDMFor) return;
    setCreatingDMFor(userId);
    onCreateDM(userId);
  };

  return (
    <div className="flex h-full w-[272px] flex-col border-r bg-background">
      {/* Header avec icone gradient */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-accent/20">
            <MessageSquare className="h-4 w-4 text-primary" />
          </div>
          <h2 className="text-sm font-bold tracking-tight">Messagerie</h2>
        </div>
        <button
          onClick={onCreateChannel}
          className="rounded-lg p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          title="Nouveau canal"
          aria-label="Nouveau canal"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Recherche */}
      <div className="px-3 py-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/60" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher..."
            className="w-full h-8 pl-8 pr-3 bg-muted/40 border border-border/30 rounded-lg text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all"
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
            <SectionHeader
              label="Canaux"
              count={filteredPublicChannels.length}
              open={channelsOpen}
              onToggle={() => setChannelsOpen(!channelsOpen)}
            />

            {channelsOpen && (
              <div className="px-2 space-y-0.5">
                {filteredPublicChannels.length === 0 && !search.trim() && (
                  <div className="px-2.5 py-3 text-center">
                    <p className="text-xs text-muted-foreground mb-2">
                      Aucun canal
                    </p>
                    <button
                      onClick={onCreateChannel}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
                    >
                      <Plus className="h-3 w-3" />
                      Créer un canal
                    </button>
                  </div>
                )}
                {filteredPublicChannels.map((ch) => {
                  const isActive = ch.id === activeChannelId;
                  const isAnnouncement = ch.type === "announcement";
                  return (
                    <button
                      key={ch.id}
                      onClick={() => onSelectChannel(ch.id)}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-2.5 h-9 rounded-lg text-[13px] transition-all",
                        isActive
                          ? "bg-primary/10 text-primary ring-1 ring-primary/20 font-semibold"
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
                            ch.urgentUnreadCount > 0 ? "destructive" : "default"
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

            {/* ── Messages directs ── */}
            <div className="mt-3">
              <div className="w-full flex items-center justify-between px-4 py-1.5">
                <button
                  onClick={() => setDmsOpen(!dmsOpen)}
                  aria-expanded={dmsOpen}
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
                  title={viewMode === "list" ? "Vue mosaïque" : "Vue liste"}
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
                  {/* Assistant IA — always first in DMs */}
                  {aiAgentId && (
                    <div className="px-2 mb-0.5">
                      <button
                        onClick={() => onSelectChannel(aiAgentId)}
                        className={cn(
                          "w-full flex items-center gap-2.5 px-2.5 h-10 rounded-lg text-[13px] transition-all",
                          activeChannelId === aiAgentId
                            ? "bg-primary/10 text-primary ring-1 ring-primary/20 font-semibold"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
                        )}
                      >
                        <div className={cn(
                          "h-7 w-7 rounded-full flex items-center justify-center shrink-0",
                          activeChannelId === aiAgentId ? "bg-brand/20" : "bg-brand/10",
                        )}>
                          <Bot className="h-4 w-4 text-brand" />
                        </div>
                        <span className="truncate flex-1 text-left">Assistant IA</span>
                        <span className="h-2 w-2 rounded-full bg-brand animate-pulse shrink-0" />
                      </button>
                    </div>
                  )}

                  {viewMode === "mosaic" ? (
                    <div className="px-2 grid grid-cols-3 gap-2">
                      {filteredDmChannels.map((ch) => {
                        const isActive = ch.id === activeChannelId;
                        const partner = ch.dmPartner;
                        return (
                          <button
                            key={ch.id}
                            onClick={() => onSelectChannel(ch.id)}
                            className={cn(
                              "flex flex-col items-center gap-1.5 p-2.5 rounded-xl text-[11px] transition-all",
                              isActive
                                ? "bg-primary/10 text-primary font-semibold ring-1 ring-primary/20"
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

                      {filteredUsersWithoutDM.map((p) => (
                        <button
                          key={`new-dm-${p.id}`}
                          onClick={() => handleDMClick(p.id)}
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
                      {filteredDmChannels.map((ch) => {
                        const isActive = ch.id === activeChannelId;
                        const partner = ch.dmPartner;
                        return (
                          <button
                            key={ch.id}
                            onClick={() => onSelectChannel(ch.id)}
                            className={cn(
                              "w-full flex items-center gap-2.5 px-2.5 h-10 rounded-lg text-[13px] transition-all",
                              isActive
                                ? "bg-primary/10 text-primary ring-1 ring-primary/20 font-semibold"
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

                      {filteredUsersWithoutDM.map((p) => (
                        <button
                          key={`new-dm-${p.id}`}
                          onClick={() => handleDMClick(p.id)}
                          disabled={creatingDMFor === p.id}
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
                            Aucun résultat
                          </p>
                        )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* ── Archives ── */}
            {filteredArchivedChannels.length > 0 && (
              <div className="mt-3">
                <SectionHeader
                  label="Archives"
                  count={filteredArchivedChannels.length}
                  open={archivesOpen}
                  onToggle={() => setArchivesOpen(!archivesOpen)}
                  icon={<Archive className="w-3 h-3" />}
                />

                {archivesOpen && (
                  <div className="px-2 space-y-0.5">
                    {filteredArchivedChannels.map((ch) => {
                      const isActive = ch.id === activeChannelId;
                      return (
                        <button
                          key={ch.id}
                          onClick={() => onSelectChannel(ch.id)}
                          className={cn(
                            "w-full flex items-center gap-2.5 px-2.5 h-9 rounded-lg text-[13px] transition-all opacity-60",
                            isActive
                              ? "bg-primary/10 text-primary ring-1 ring-primary/20 font-semibold opacity-100"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted/60 hover:opacity-80",
                          )}
                        >
                          <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 bg-muted/40">
                            <Archive className="w-3.5 h-3.5 text-muted-foreground/50" />
                          </div>
                          <span className="truncate flex-1 text-left">
                            {ch.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Composant section header reutilisable ──

function SectionHeader({
  label,
  count,
  open,
  onToggle,
  icon,
}: {
  label: string;
  count: number;
  open: boolean;
  onToggle: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <div className="mb-1">
      <button
        onClick={onToggle}
        aria-expanded={open}
        className="w-full flex items-center justify-between px-4 py-1.5 text-[11px] font-bold text-primary/70 uppercase tracking-wider hover:text-primary transition-colors"
      >
        <div className="flex items-center gap-1.5">
          {open ? (
            <ChevronDown className="w-3 h-3" />
          ) : (
            <ChevronRight className="w-3 h-3" />
          )}
          {icon}
          {label}
        </div>
        <span className="text-[10px] font-normal text-muted-foreground">
          {count}
        </span>
      </button>
    </div>
  );
}
