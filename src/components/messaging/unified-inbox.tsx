"use client";

import { useState } from "react";
import {
  MessageSquare,
  Phone,
  Mail,
  Instagram,
  Linkedin,
  Search,
  Filter,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type Platform = "all" | "whatsapp" | "linkedin" | "instagram" | "email";

const PLATFORMS: {
  id: Platform;
  label: string;
  icon: React.ReactNode;
  color: string;
}[] = [
  {
    id: "all",
    label: "Tous",
    icon: <MessageSquare className="h-4 w-4" />,
    color: "text-foreground",
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    icon: <Phone className="h-4 w-4" />,
    color: "text-green-500",
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    icon: <Linkedin className="h-4 w-4" />,
    color: "text-blue-500",
  },
  {
    id: "instagram",
    label: "Instagram",
    icon: <Instagram className="h-4 w-4" />,
    color: "text-pink-500",
  },
  {
    id: "email",
    label: "Email",
    icon: <Mail className="h-4 w-4" />,
    color: "text-amber-500",
  },
];

export function UnifiedInbox() {
  const [activePlatform, setActivePlatform] = useState<Platform>("all");
  const [search, setSearch] = useState("");

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b px-6 py-4">
        <h2 className="text-lg font-semibold">Boîte unifiée</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Centralisez vos conversations externes
        </p>
      </div>

      {/* Platform tabs */}
      <div className="flex items-center gap-1 border-b px-4 py-2 overflow-x-auto">
        {PLATFORMS.map((p) => (
          <button
            key={p.id}
            onClick={() => setActivePlatform(p.id)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap",
              activePlatform === p.id
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <span className={p.color}>{p.icon}</span>
            {p.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 px-4 py-3 border-b">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une conversation..."
            className="h-8 pl-8 text-xs"
          />
        </div>
        <button className="rounded-lg p-2 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
          <Filter className="h-4 w-4" />
        </button>
      </div>

      {/* Empty state / Integration placeholder */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <MessageSquare className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-base font-semibold mb-2">Boîte unifiée</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Retrouvez ici toutes vos conversations WhatsApp, LinkedIn, Instagram
            et Email en un seul endroit.
          </p>

          {/* Integration cards */}
          <div className="space-y-2 text-left">
            {[
              {
                icon: <Phone className="h-4 w-4 text-green-500" />,
                label: "WhatsApp Business",
                desc: "Connectez votre compte WhatsApp",
                link: "/settings/integrations",
              },
              {
                icon: <Linkedin className="h-4 w-4 text-blue-500" />,
                label: "LinkedIn",
                desc: "Synchronisez vos messages LinkedIn",
                link: "/settings/integrations",
              },
              {
                icon: <Instagram className="h-4 w-4 text-pink-500" />,
                label: "Instagram",
                desc: "Connectez votre messagerie Instagram",
                link: "/settings/integrations",
              },
              {
                icon: <Mail className="h-4 w-4 text-amber-500" />,
                label: "Email",
                desc: "Intégrez votre boîte mail",
                link: "/settings/integrations",
              },
            ].map((item) => (
              <a
                key={item.label}
                href={item.link}
                className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
