"use client";

import { useState, useEffect, useCallback } from "react";
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
  Loader2,
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
import { globalSearch, type SearchResult } from "@/lib/actions/search";

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

const TYPE_ICONS = {
  contact: Users,
  deal: Kanban,
  booking: CalendarDays,
};

const TYPE_LABELS = {
  contact: "Contacts",
  deal: "Deals",
  booking: "Bookings",
};

export function GlobalSearch() {
  const router = useRouter();
  const { searchOpen, setSearchOpen } = useUIStore();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

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

  // Debounced search
  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    setSearching(true);
    const timeout = setTimeout(async () => {
      const data = await globalSearch(query);
      setResults(data);
      setSearching(false);
    }, 300);

    return () => clearTimeout(timeout);
  }, [query]);

  // Reset on close
  useEffect(() => {
    if (!searchOpen) {
      setQuery("");
      setResults([]);
    }
  }, [searchOpen]);

  function handleSelect(href: string) {
    setSearchOpen(false);
    router.push(href);
  }

  // Group results by type
  const groupedResults = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    if (!acc[r.type]) acc[r.type] = [];
    acc[r.type].push(r);
    return acc;
  }, {});

  return (
    <CommandDialog
      open={searchOpen}
      onOpenChange={setSearchOpen}
      title="Recherche"
      description="Rechercher dans l'application"
    >
      <CommandInput
        placeholder="Rechercher un contact, un deal, un booking..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {searching && (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {!searching && query.length >= 2 && results.length === 0 && (
          <CommandEmpty>Aucun résultat pour &quot;{query}&quot;</CommandEmpty>
        )}

        {/* Dynamic search results */}
        {Object.entries(groupedResults).map(([type, items]) => {
          const Icon = TYPE_ICONS[type as keyof typeof TYPE_ICONS];
          const label = TYPE_LABELS[type as keyof typeof TYPE_LABELS];
          return (
            <CommandGroup key={type} heading={label}>
              {items.map((item) => (
                <CommandItem
                  key={item.id}
                  onSelect={() => handleSelect(item.href)}
                  className="gap-3"
                >
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <div className="flex flex-col">
                    <span>{item.title}</span>
                    {item.subtitle && (
                      <span className="text-xs text-muted-foreground">{item.subtitle}</span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          );
        })}

        {results.length > 0 && <CommandSeparator />}

        {/* Quick navigation (show when no search or always) */}
        {query.length < 2 && (
          <>
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
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
