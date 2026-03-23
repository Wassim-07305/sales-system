import { createClient } from "@/lib/supabase/server";
import { getSegments, getSegmentStats } from "@/lib/actions/segmentation";
import { getProspectsForEnrichment } from "@/lib/actions/enrichment";
import { SegmentsPageView } from "./segments-page-view";

export default async function SegmentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [segments, segmentStats, enrichmentProspects] = await Promise.all([
    getSegments(),
    getSegmentStats(),
    getProspectsForEnrichment(),
  ]);

  return (
    <div className="pb-8">
      <SegmentsPageView
        segments={segments ?? []}
        segmentStats={segmentStats}
        enrichmentProspects={enrichmentProspects ?? []}
      />
    </div>
  );
}
