"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Star, Layers, Sparkles } from "lucide-react";
import { ScoringView } from "./scoring-view";
import { SegmentsView } from "../segments/segments-view";
import { EnrichmentView } from "../enrichment/enrichment-view";

interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  scoringProspects: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  segments: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  segmentStats: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  enrichmentProspects: any[];
}

export function ScoringUnifiedView({
  scoringProspects,
  segments,
  segmentStats,
  enrichmentProspects,
}: Props) {
  return (
    <div className="space-y-6">
      {/* Scoring — always visible */}
      <ScoringView prospects={scoringProspects} />

      {/* Additional sections */}
      <Accordion type="multiple" defaultValue={["segments"]} className="space-y-2">
        <AccordionItem value="segments" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4" />
              <span>Segments</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <SegmentsView
              initialSegments={segments}
              initialStats={segmentStats}
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="enrichment" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              <span>Enrichissement IA</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <EnrichmentView prospects={enrichmentProspects} />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
