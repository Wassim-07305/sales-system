"use client";

import { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  Kanban,
  GraduationCap,
  MessageSquare,
  Target,
  CalendarDays,
  LayoutDashboard,
  BarChart3,
  Settings,
} from "lucide-react";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command";
import { useUIStore } from "@/stores/ui-store";

const QUICK_LINKS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "CRM Pipeline", href: "/crm", icon: Kanban },
  { label: "Contacts", href: "/contacts", icon: Users },
  { label: "Bookings", href: "/bookings", icon: CalendarDays },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "Prospection", href: "/prospecting", icon: Target },
  { label: "Academy", href: "/academy", icon: GraduationCap },
  { label: "Chat", href: "/chat", icon: MessageSquare },
  { label: "Paramètres", href: "/settings", icon: Settings },
];

export function GlobalSearch() {
  const router = useRouter();
  const { searchOpen, setSearchOpen } = useUIStore();

  // Keyboard shortcut: ⌘K
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(!searchOpen);
      }
    },
    [searchOpen, setSearchOpen]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  function handleSelect(href: string) {
    setSearchOpen(false);
    router.push(href);
  }

  return (
    <CommandDialog
      open={searchOpen}
      onOpenChange={setSearchOpen}
      title="Recherche"
      description="Rechercher dans l'application"
    >
      <CommandInput placeholder="Rechercher une page, un contact, un deal..." />
      <CommandList>
        <CommandEmpty>Aucun résultat trouvé.</CommandEmpty>

        <CommandGroup heading="Navigation rapide">
          {QUICK_LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <CommandItem
                key={link.href}
                onSelect={() => handleSelect(link.href)}
                className="gap-3"
              >
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span>{link.label}</span>
              </CommandItem>
            );
          })}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Actions">
          <CommandItem
            onSelect={() => handleSelect("/crm")}
            className="gap-3"
          >
            <Kanban className="h-4 w-4 text-muted-foreground" />
            <span>Nouveau deal</span>
          </CommandItem>
          <CommandItem
            onSelect={() => handleSelect("/contacts")}
            className="gap-3"
          >
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>Nouveau contact</span>
          </CommandItem>
          <CommandItem
            onSelect={() => handleSelect("/bookings")}
            className="gap-3"
          >
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <span>Nouveau booking</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
