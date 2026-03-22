import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getProspectById,
  getProspectScore,
  getProspectLists,
  getSettersForAssignment,
  getProspectReminders,
} from "@/lib/actions/prospecting";
import { getPipelineStages } from "@/lib/actions/crm";
import { getFollowUpSequences } from "@/lib/actions/hub-setting";
import { ProspectDetail } from "./prospect-detail";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ProspectPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const [prospectResult, score, lists, setters, stages, reminders, sequences] = await Promise.all([
    getProspectById(id),
    getProspectScore(id),
    getProspectLists(),
    getSettersForAssignment(),
    getPipelineStages(),
    getProspectReminders(id),
    getFollowUpSequences().catch(() => []),
  ]);

  if (prospectResult.error || !prospectResult.prospect) {
    notFound();
  }

  // Fetch linked inbox conversation (if any)
  const { data: dmConv } = await supabase
    .from("dm_conversations")
    .select("id")
    .eq("prospect_id", id)
    .order("last_message_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Fetch linked deal (if prospect was converted)
  let linkedDeal: { id: string; title: string } | null = null;
  if (["booked", "converted", "qualified"].includes(prospectResult.prospect.status)) {
    const prospectName = prospectResult.prospect.name;
    const { data: deal } = await supabase
      .from("deals")
      .select("id, title")
      .or(`source.eq.prospecting,source.eq.scoring`)
      .ilike("title", `%${prospectName.replace(/[%_\\]/g, (c: string) => `\\${c}`)}%`)
      .limit(1)
      .maybeSingle();
    linkedDeal = deal;
  }

  return (
    <ProspectDetail
      prospect={prospectResult.prospect}
      score={score}
      lists={lists}
      setters={setters}
      stages={stages}
      inboxConversationId={dmConv?.id ?? null}
      linkedDeal={linkedDeal}
      reminders={reminders}
      sequences={sequences as { id: string; name: string; description: string | null; steps: unknown[]; is_active: boolean }[]}
    />
  );
}
