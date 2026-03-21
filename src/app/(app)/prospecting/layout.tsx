"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Target,
  Link2,
  BarChart3,
  Send,
} from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { label: "Prospects", href: "/prospecting", icon: Target, exact: true },
  { label: "Hub LinkedIn", href: "/prospecting/linkhub", icon: Link2 },
  { label: "Analyse", href: "/prospecting/analyse", icon: BarChart3 },
  { label: "Outreach", href: "/prospecting/outreach", icon: Send },
];

export default function ProspectingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Don't show prospecting tabs on prospect detail pages (/prospecting/[id])
  const isDetailPage = /^\/prospecting\/[^/]+$/.test(pathname) &&
    !TABS.some((t) => t.href === pathname);

  // Hide tabs on old direct sub-pages that still exist for backwards compat
  const oldDirectPages = [
    "/prospecting/intelligence",
    "/prospecting/linkedin",
    "/prospecting/instagram",
    "/prospecting/scoring",
    "/prospecting/segments",
    "/prospecting/enrichment",
    "/prospecting/templates",
    "/prospecting/campaigns",
    "/prospecting/follow-ups",
    "/prospecting/hub",
    "/prospecting/acquisition",
    "/prospecting/qualification",
  ];
  const isOldPage = oldDirectPages.some((p) => pathname.startsWith(p));

  function isActive(tab: (typeof TABS)[number]) {
    if (tab.exact) return pathname === tab.href;
    return pathname.startsWith(tab.href);
  }

  if (isDetailPage || isOldPage) {
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
