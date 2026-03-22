import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  getProspects,
  getDailyQuota,
  getProspectLists,
  getProspectSegmentStats,
} from "@/lib/actions/prospecting";
import { ProspectingView } from "./prospecting-view";

export default async function ProspectingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (
    !profile ||
    !["admin", "manager", "setter", "closer"].includes(profile.role)
  ) {
    redirect("/dashboard");
  }

  const prospects = await getProspects();
  const quota = await getDailyQuota();
  const lists = await getProspectLists();
  const segmentStats = await getProspectSegmentStats();

  // Fetch scores for all prospects
  const prospectIds = prospects.map(
    (p: Record<string, unknown>) => p.id as string,
  );
  const { data: scores } = await supabase
    .from("prospect_scores")
    .select("prospect_id, total_score, temperature")
    .in("prospect_id", prospectIds.length > 0 ? prospectIds : ["__none__"]);

  const scoresMap: Record<
    string,
    { total_score: number; temperature: string }
  > = {};
  for (const s of scores || []) {
    scoresMap[s.prospect_id as string] = {
      total_score: (s.total_score as number) ?? 0,
      temperature: (s.temperature as string) ?? "cold",
    };
  }

  // Fetch relance statuses for all prospects (table may not exist yet)
  const relanceMap: Record<string, string> = {};
  try {
    const { data: relances, error: relanceError } = await supabase
      .from("relance_workflows")
      .select("prospect_id, status")
      .in("prospect_id", prospectIds.length > 0 ? prospectIds : ["__none__"])
      .order("created_at", { ascending: false });

    if (!relanceError) {
      for (const r of relances || []) {
        // Keep the most recent relance status per prospect
        if (!relanceMap[r.prospect_id as string]) {
          relanceMap[r.prospect_id as string] = r.status as string;
        }
      }
    }
  } catch {
    // relance_workflows table may not exist yet — continue without relance data
  }

  // Fetch dm_conversation existence for each prospect
  const convMap: Record<string, boolean> = {};
  try {
    const { data: convs } = await supabase
      .from("dm_conversations")
      .select("prospect_id")
      .in("prospect_id", prospectIds.length > 0 ? prospectIds : ["__none__"]);
    for (const c of convs || []) {
      convMap[c.prospect_id as string] = true;
    }
  } catch {
    // dm_conversations table may not exist
  }

  const prospectsWithScores = prospects.map((p: Record<string, unknown>) => ({
    ...p,
    computed_score: scoresMap[p.id as string] ?? null,
    relance_status: relanceMap[p.id as string] ?? null,
    has_conversation: convMap[p.id as string] ?? false,
  }));

  return (
    <ProspectingView
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      prospects={prospectsWithScores as any}
      quota={quota}
      lists={lists}
      segmentStats={segmentStats}
    />
  );
}
