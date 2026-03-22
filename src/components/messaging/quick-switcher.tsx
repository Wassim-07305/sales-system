"use client";

import { useEffect, useCallback } from "react";
import { Hash, Megaphone, Bot, MessageSquare, Archive } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import type { ChannelWithMeta } from "@/lib/types/messaging";

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

interface QuickSwitcherProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  publicChannels: ChannelWithMeta[];
  dmChannels: ChannelWithMeta[];
  archivedChannels: ChannelWithMeta[];
  onSelectChannel: (channelId: string) => void;
  aiAgentId?: string;
}

export function QuickSwitcher({
  open,
  onOpenChange,
  publicChannels,
  dmChannels,
  archivedChannels,
  onSelectChannel,
  aiAgentId,
}: QuickSwitcherProps) {
  // Global Cmd+K shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  const handleSelect = useCallback(
    (channelId: string) => {
      onSelectChannel(channelId);
      onOpenChange(false);
    },
    [onSelectChannel, onOpenChange],
  );

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Recherche rapide"
      description="Chercher un canal ou une conversation"
    >
      <CommandInput placeholder="Chercher un canal, une personne..." />
      <CommandList>
        <CommandEmpty>Aucun résultat trouvé.</CommandEmpty>

        {/* AI Agent */}
        {aiAgentId && (
          <CommandGroup heading="Assistant">
            <CommandItem onSelect={() => handleSelect(aiAgentId)}>
              <div className="h-6 w-6 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                <Bot className="h-3.5 w-3.5 text-emerald-500" />
              </div>
              <span>Assistant IA</span>
              <span className="ml-auto text-[10px] text-muted-foreground">Coach</span>
            </CommandItem>
          </CommandGroup>
        )}

        {/* Public channels */}
        {publicChannels.length > 0 && (
          <CommandGroup heading="Canaux">
            {publicChannels.map((ch) => (
              <CommandItem
                key={ch.id}
                value={ch.name}
                onSelect={() => handleSelect(ch.id)}
              >
                <div className="h-6 w-6 rounded-md bg-muted/60 flex items-center justify-center shrink-0">
                  {ch.type === "announcement" ? (
                    <Megaphone className="h-3.5 w-3.5 text-muted-foreground" />
                  ) : (
                    <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </div>
                <span>{ch.name}</span>
                {ch.unreadCount > 0 && (
                  <span className="ml-auto text-[10px] font-medium text-primary">
                    {ch.unreadCount} non lu{ch.unreadCount > 1 ? "s" : ""}
                  </span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* DM channels */}
        {dmChannels.length > 0 && (
          <CommandGroup heading="Messages directs">
            {dmChannels.map((ch) => {
              const partner = ch.dmPartner;
              return (
                <CommandItem
                  key={ch.id}
                  value={partner?.full_name ?? ch.name}
                  onSelect={() => handleSelect(ch.id)}
                >
                  <Avatar className="h-6 w-6 shrink-0">
                    <AvatarImage src={partner?.avatar_url ?? undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary text-[9px] font-semibold">
                      {partner ? getInitials(partner.full_name) : "?"}
                    </AvatarFallback>
                  </Avatar>
                  <span>{partner?.full_name ?? ch.name}</span>
                  {ch.unreadCount > 0 && (
                    <span className="ml-auto text-[10px] font-medium text-primary">
                      {ch.unreadCount}
                    </span>
                  )}
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}

        {/* Archived */}
        {archivedChannels.length > 0 && (
          <CommandGroup heading="Archives">
            {archivedChannels.map((ch) => (
              <CommandItem
                key={ch.id}
                value={`archive ${ch.name}`}
                onSelect={() => handleSelect(ch.id)}
              >
                <div className="h-6 w-6 rounded-md bg-muted/40 flex items-center justify-center shrink-0">
                  <Archive className="h-3.5 w-3.5 text-muted-foreground/50" />
                </div>
                <span className="text-muted-foreground">{ch.name}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>

      <div className="border-t px-3 py-2 flex items-center gap-4 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 rounded border bg-muted font-mono text-[10px]">↑↓</kbd>
          Naviguer
        </span>
        <span className="flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 rounded border bg-muted font-mono text-[10px]">↵</kbd>
          Ouvrir
        </span>
        <span className="flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 rounded border bg-muted font-mono text-[10px]">Esc</kbd>
          Fermer
        </span>
      </div>
    </CommandDialog>
  );
}
