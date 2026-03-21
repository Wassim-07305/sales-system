import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ScoringView } from "../../scoring/scoring-view";
import { computeScoreBreakdown } from "@/lib/scoring";

export default async function ScoringPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: prospects } = await supabase
    .from("prospects")
    .select(
      "*, scores:prospect_scores(engagement_score, responsiveness_score, qualification_score, total_score, temperature, computed_at)",
    )
    .order("created_at", { ascending: false });

  const allProspects = (prospects || []).map((p: Record<string, unknown>) => ({
    ...p,
    scores: Array.isArray(p.scores) ? p.scores[0] || null : p.scores,
  }));

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <ScoringView prospects={prospectsWithBreakdown as any} />;
}
