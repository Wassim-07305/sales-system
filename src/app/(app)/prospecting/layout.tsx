"use client";

import { usePathname } from "next/navigation";
import {
  Users,
  Zap,
  Star,
  Megaphone,
  Layers,
  BarChart3,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { UnifiedTabs, type UnifiedTab } from "@/components/ui/unified-tabs";
import { ProspectingKPIBanner } from "./prospecting-kpi-banner";

const TABS: UnifiedTab[] = [
  {
    label: "Prospects",
    value: "prospects",
    icon: Users,
    href: "/prospecting/prospects",
  },
  {
    label: "Engage",
    value: "engage",
    icon: Zap,
    href: "/prospecting/engage",
  },
  {
    label: "Scoring",
    value: "scoring",
    icon: Star,
    href: "/prospecting/scoring",
  },
  {
    label: "Campagnes",
    value: "campaigns",
    icon: Megaphone,
    href: "/prospecting/campaigns",
    exact: false,
  },
  {
    label: "Segments",
    value: "segments",
    icon: Layers,
    href: "/prospecting/segments",
  },
  {
    label: "Analytics",
    value: "analytics",
    icon: BarChart3,
    href: "/prospecting/analytics",
  },
];

export default function ProspectingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Hide layout on prospect detail pages (/prospecting/[uuid])
  const isDetailPage = /^\/prospecting\/[0-9a-f-]{36}/.test(pathname);

  if (isDetailPage) {
    return <>{children}</>;
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Prospection"
        description="Recherchez, qualifiez et engagez vos prospects"
      />

      {/* KPI banner */}
      <div className="rounded-lg border border-border/50 bg-muted/20 px-4">
        <ProspectingKPIBanner />
      </div>

      {/* Navigation tabs */}
      <UnifiedTabs tabs={TABS} />

      {/* Page content */}
      {children}
    </div>
  );
}
