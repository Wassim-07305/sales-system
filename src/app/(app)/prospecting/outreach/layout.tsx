"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, Send, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { label: "Templates", href: "/prospecting/outreach", icon: FileText, exact: true },
  { label: "Campagnes", href: "/prospecting/outreach/campaigns", icon: Send },
  { label: "Relances", href: "/prospecting/outreach/follow-ups", icon: Clock },
];

export default function OutreachLayout({
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
    <div className="space-y-4">
      <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-border/30 scrollbar-none">
        {TABS.map((tab) => {
          const active = isActive(tab);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors",
                active
                  ? "bg-emerald-500/10 text-emerald-500"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
              )}
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </Link>
          );
        })}
      </div>
      {children}
    </div>
  );
}
