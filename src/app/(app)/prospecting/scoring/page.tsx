import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ScoringView } from "./scoring-view";

export default async function ScoringPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch all prospects with their scores, sorted by engagement_score descending
  const { data: prospects } = await supabase
    .from("prospects")
    .select("*, scores:prospect_scores(engagement_score, calculated_at)")
    .order("created_at", { ascending: false });

  const allProspects = (prospects || [])
    .map((p: Record<string, unknown>) => ({
      ...p,
      scores: Array.isArray(p.scores) ? p.scores[0] || null : p.scores,
    }))
    .sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
      const scoreA =
        (a.scores as Record<string, unknown> | null)?.engagement_score as number | undefined ?? 0;
      const scoreB =
        (b.scores as Record<string, unknown> | null)?.engagement_score as number | undefined ?? 0;
      return scoreB - scoreA;
    });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <ScoringView prospects={allProspects as any} />;
}
