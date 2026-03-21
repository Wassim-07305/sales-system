"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Funnel,
  TrendingUp,
  Smile,
  Target,
  Users,
  LineChart,
  Layers,
  MapPin,
  Flame,
  Award,
  Zap,
  FileText,
  GitBranch,
  ShieldAlert,
  Brain,
} from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { label: "Dashboard", href: "/analytics", icon: BarChart3, exact: true },
  { label: "Funnel", href: "/analytics/funnel", icon: Funnel },
  { label: "Sources", href: "/analytics/sources", icon: GitBranch },
  { label: "Attribution", href: "/analytics/attribution", icon: Layers },
  { label: "Projections", href: "/analytics/projections", icon: TrendingUp },
  { label: "NPS", href: "/analytics/nps", icon: Smile },
  { label: "Performance", href: "/analytics/performance", icon: Zap },
  { label: "Heatmap", href: "/analytics/heatmap", icon: Flame },
  { label: "Cohortes", href: "/analytics/cohorts", icon: Users },
  { label: "Rétention", href: "/analytics/retention", icon: Target },
  { label: "Objections", href: "/analytics/objections", icon: ShieldAlert },
  { label: "Benchmarking", href: "/analytics/benchmarking", icon: Award },
  { label: "Rapports setter", href: "/analytics/setter-reports", icon: FileText },
  { label: "Rapports valeur", href: "/analytics/value-reports", icon: LineChart },
  { label: "Rapports", href: "/analytics/reports", icon: MapPin },
  { label: "Intelligence", href: "/analytics/intelligence", icon: Brain },
];

export default function AnalyticsLayout({
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
