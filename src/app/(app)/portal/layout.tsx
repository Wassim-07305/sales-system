"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  FileText,
  FolderOpen,
  Clock,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { label: "Vue d'ensemble", href: "/portal", icon: Building2, exact: true },
  { label: "Mon ESOP", href: "/portal/esop", icon: FileText },
  { label: "Mes SOPs", href: "/portal/sops", icon: FolderOpen },
  { label: "Parcours", href: "/portal/timeline", icon: Clock },
  { label: "Rapports", href: "/portal/reports", icon: BarChart3 },
];

export default function PortalLayout({
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
