"use client";

import { useState } from "react";
import {
  Hash,
  Lock,
  Megaphone,
  Search,
  Pin,
  BellOff,
  Bell,
  Archive,
  Settings,
  Users,
  ChevronLeft,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
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

interface ChatHeaderProps {
  channel: ChannelWithMeta;
  memberCount: number;
  onToggleMute: () => void;
  onToggleArchive: () => void;
  onOpenSettings: () => void;
  onBack?: () => void;
}

export function ChatHeader({
  channel,
  memberCount,
  onToggleMute,
  onToggleArchive,
  onOpenSettings,
  onBack,
}: ChatHeaderProps) {
  const {
    showSearchPanel,
    setShowSearchPanel,
    searchQuery,
    setSearchQuery,
    showMembersPanel,
    setShowMembersPanel,
  } = useMessagingStore();

  const [localSearch, setLocalSearch] = useState(searchQuery);

  const isDM = channel.type === "direct";
  const isAnnouncement = channel.type === "announcement";

  const channelIcon = isDM ? null : isAnnouncement ? (
    <Megaphone className="h-4 w-4 text-primary" />
  ) : (
    <Hash className="h-4 w-4 text-muted-foreground" />
  );

  const displayName = isDM
    ? (channel.dmPartner?.full_name ?? "Message direct")
    : channel.name;

  const handleSearchSubmit = () => {
    setSearchQuery(localSearch);
  };

  const handleCloseSearch = () => {
    setShowSearchPanel(false);
    setSearchQuery("");
    setLocalSearch("");
  };

  return (
    <div className="flex items-center gap-3 border-b px-4 py-3 bg-background">
      {/* Back button (mobile) */}
      {onBack && (
        <button
          onClick={onBack}
          className="rounded-lg p-1.5 hover:bg-muted transition-colors md:hidden"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}

      {/* Channel info */}
      {isDM && channel.dmPartner ? (
        <Avatar className="h-8 w-8">
          <AvatarImage src={channel.dmPartner.avatar_url ?? undefined} />
          <AvatarFallback className="bg-primary/10 text-primary text-xs">
            {getInitials(channel.dmPartner.full_name)}
          </AvatarFallback>
        </Avatar>
      ) : (
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
          {channelIcon}
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          {!isDM && channelIcon}
          <h3 className="text-sm font-semibold truncate">{displayName}</h3>
          {channel.type === "direct" && (
            <Lock className="h-3 w-3 text-muted-foreground" />
          )}
        </div>
        {channel.description && !showSearchPanel && (
          <p className="text-xs text-muted-foreground truncate">
            {channel.description}
          </p>
        )}
        {!channel.description && !showSearchPanel && (
          <p className="text-xs text-muted-foreground">
            {memberCount} membre{memberCount > 1 ? "s" : ""}
          </p>
        )}
      </div>

      {/* Search bar (expanded) */}
      {showSearchPanel && (
        <div className="flex items-center gap-2 flex-1 max-w-sm">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearchSubmit();
                if (e.key === "Escape") handleCloseSearch();
              }}
              placeholder="Rechercher dans les messages..."
              className="h-8 pl-8 text-xs"
              autoFocus
            />
          </div>
          <button
            onClick={handleCloseSearch}
            className="rounded p-1 hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-0.5">
        <button
          onClick={() => setShowSearchPanel(!showSearchPanel)}
          className={cn(
            "rounded-lg p-2 transition-colors",
            showSearchPanel
              ? "bg-primary/10 text-primary"
              : "hover:bg-muted text-muted-foreground hover:text-foreground",
          )}
          title="Rechercher"
        >
          <Search className="h-4 w-4" />
        </button>

        <button
          onClick={() => setShowMembersPanel(!showMembersPanel)}
          className={cn(
            "rounded-lg p-2 transition-colors",
            showMembersPanel
              ? "bg-primary/10 text-primary"
              : "hover:bg-muted text-muted-foreground hover:text-foreground",
          )}
          title="Membres"
        >
          <Users className="h-4 w-4" />
        </button>

        <button
          onClick={onToggleMute}
          className="rounded-lg p-2 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          title={channel.isMuted ? "Reactiver" : "Muet"}
        >
          {channel.isMuted ? (
            <BellOff className="h-4 w-4" />
          ) : (
            <Bell className="h-4 w-4" />
          )}
        </button>

        <button
          onClick={onToggleArchive}
          className="rounded-lg p-2 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          title={channel.is_archived ? "Desarchiver" : "Archiver"}
        >
          <Archive className="h-4 w-4" />
        </button>

        <button
          onClick={onOpenSettings}
          className="rounded-lg p-2 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          title="Parametres"
        >
          <Settings className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
