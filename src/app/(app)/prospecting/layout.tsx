"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Target,
  Link2,
  Search,
  Brain,
  Star,
  FileText,
  Clock,
  Sparkles,
  Send,
  Linkedin,
  Instagram,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { label: "Prospects", href: "/prospecting", icon: Target, exact: true },
  { label: "Hub LinkedIn", href: "/prospecting/linkhub", icon: Link2 },
  { label: "Découverte", href: "/prospecting/discovery", icon: Search },
  { label: "Intelligence", href: "/prospecting/intelligence", icon: Brain },
  { label: "Scoring", href: "/prospecting/scoring", icon: Star },
  { label: "Templates", href: "/prospecting/templates", icon: FileText },
  { label: "Relances", href: "/prospecting/follow-ups", icon: Clock },
  { label: "Enrichissement", href: "/prospecting/enrichment", icon: Sparkles },
  { label: "Campagnes", href: "/prospecting/campaigns", icon: Send },
  { label: "LinkedIn", href: "/prospecting/linkedin", icon: Linkedin, exact: true },
  { label: "Instagram", href: "/prospecting/instagram", icon: Instagram },
  { label: "Segments", href: "/prospecting/segments", icon: Layers },
];

export default function ProspectingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Don't show prospecting tabs on prospect detail pages
  const isDetailPage = /^\/prospecting\/[^/]+$/.test(pathname) &&
    !TABS.some((t) => t.href === pathname || (t.exact && pathname === t.href));

  function isActive(tab: (typeof TABS)[number]) {
    if (tab.exact) return pathname === tab.href;
    return pathname.startsWith(tab.href);
  }

  if (isDetailPage) {
    return <>{children}</>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-border/50 scrollbar-none">
        {TABS.map((tab) => {
          const active = isActive(tab);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors",
                active
                  ? "bg-brand/10 text-brand"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </Link>
          );
        })}
      </div>
      {children}
    </div>
  );
}
