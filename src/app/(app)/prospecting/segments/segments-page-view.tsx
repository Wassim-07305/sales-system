"use client";

import { useState } from "react";
import { Layers, Sparkles } from "lucide-react";
import { UnifiedTabs, type UnifiedTab } from "@/components/ui/unified-tabs";
import { SegmentsView } from "./segments-view";
import { EnrichmentView } from "../enrichment/enrichment-view";

const TABS: UnifiedTab[] = [
  { label: "Segments", value: "segments", icon: Layers },
  { label: "Enrichissement IA", value: "enrichment", icon: Sparkles },
];

interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  segments: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  segmentStats: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  enrichmentProspects: any[];
}

export function SegmentsPageView({
  segments,
  segmentStats,
  enrichmentProspects,
}: Props) {
  const [activeTab, setActiveTab] = useState("segments");

  return (
    <div className="space-y-5">
      <UnifiedTabs tabs={TABS} active={activeTab} onTabChange={setActiveTab} />

      <div>
        {activeTab === "segments" && (
          <SegmentsView
            initialSegments={segments}
            initialStats={segmentStats}
          />
        )}
        {activeTab === "enrichment" && (
          <EnrichmentView prospects={enrichmentProspects} />
        )}
      </div>
    </div>
  );
}
