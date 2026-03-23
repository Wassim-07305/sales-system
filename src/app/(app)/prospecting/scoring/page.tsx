import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { computeScoreBreakdown } from "@/lib/scoring";
import { getSegments, getSegmentStats } from "@/lib/actions/segmentation";
import { getProspectsForEnrichment } from "@/lib/actions/enrichment";
import { ScoringUnifiedView } from "./scoring-unified-view";

export default async function ScoringPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch all data in parallel
  const [prospectsResult, segments, segmentStats, enrichmentProspects] =
    await Promise.all([
      supabase
        .from("prospects")
        .select(
          "*, scores:prospect_scores(engagement_score, responsiveness_score, qualification_score, total_score, temperature, computed_at)",
        )
        .order("created_at", { ascending: false }),
      getSegments(),
      getSegmentStats(),
      getProspectsForEnrichment(),
    ]);

  // Process scoring data
  const allProspects = (prospectsResult.data || []).map(
    (p: Record<string, unknown>) => ({
      ...p,
      scores: Array.isArray(p.scores) ? p.scores[0] || null : p.scores,
    }),
  );

  const prospectsWithBreakdown = allProspects.map(
    (p: Record<string, unknown>) => ({
      ...p,
      breakdown: computeScoreBreakdown(p, allProspects),
    }),
  );

  prospectsWithBreakdown.sort(
    (a: Record<string, unknown>, b: Record<string, unknown>) => {
      const bkA = a.breakdown as { total: number };
      const bkB = b.breakdown as { total: number };
      return bkB.total - bkA.total;
    },
  );

  return (
    <ScoringUnifiedView
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      scoringProspects={prospectsWithBreakdown as any}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      segments={segments as any}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      segmentStats={segmentStats as any}
      enrichmentProspects={enrichmentProspects}
    />
  );
}
