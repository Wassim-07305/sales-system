"use client";

import { usePathname } from "next/navigation";
import { Linkedin, Instagram, Star, Send } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { UnifiedTabs, type UnifiedTab } from "@/components/ui/unified-tabs";
import { ProspectingKPIBanner } from "./prospecting-kpi-banner";

const TABS: UnifiedTab[] = [
  {
    label: "LinkedIn",
    value: "linkedin",
    icon: Linkedin,
    href: "/prospecting/linkedin",
  },
  {
    label: "Instagram",
    value: "instagram",
    icon: Instagram,
    href: "/prospecting/instagram",
  },
  {
    label: "Scoring",
    value: "scoring",
    icon: Star,
    href: "/prospecting/scoring",
  },
  {
    label: "Outreach",
    value: "outreach",
    icon: Send,
    href: "/prospecting/outreach",
    exact: false,
  },
];

export default function ProspectingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Hide layout on prospect detail pages (/prospecting/[uuid])
  const isDetailPage =
    /^\/prospecting\/[0-9a-f-]{36}/.test(pathname);

  if (isDetailPage) {
    return <>{children}</>;
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Prospection"
        description="Recherchez, qualifiez et engagez vos prospects"
      />

      {/* KPI banner — compact stats always visible */}
      <div className="px-6">
        <div className="rounded-lg border border-border/50 bg-muted/20 px-4">
          <ProspectingKPIBanner />
        </div>
      </div>

      {/* Unified tabs */}
      <div className="px-6">
        <UnifiedTabs tabs={TABS} />
      </div>

      {/* Tab content */}
      {children}
    </div>
  );
}
