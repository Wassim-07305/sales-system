"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Linkedin,
  BarChart3,
  Play,
  Sparkles,
  MessageSquare,
  Target,
  LayoutDashboard,
} from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { label: "Dashboard", href: "/prospecting/linkhub", icon: LayoutDashboard, exact: true },
  { label: "Feeds", href: "/prospecting/linkhub/feeds", icon: Linkedin },
  { label: "Session", href: "/prospecting/linkhub/session", icon: Play },
  { label: "Statistiques", href: "/prospecting/linkhub/stats", icon: BarChart3 },
  { label: "Mon style", href: "/prospecting/linkhub/mon-style", icon: Target },
  { label: "Recommandations", href: "/prospecting/linkhub/recommandations", icon: Sparkles },
  { label: "Réponses", href: "/prospecting/linkhub/replies", icon: MessageSquare },
];

export default function LinkhubLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  function isActive(tab: (typeof TABS)[number]) {
    if (tab.exact) return pathname === tab.href;
    return pathname.startsWith(tab.href);
  }

  return (
    <div className="space-y-6">
      {/* Tab bar */}
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

      {/* Tab content */}
      {children}
    </div>
  );
}
