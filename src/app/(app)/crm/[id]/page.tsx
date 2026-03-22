import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getDealById,
  getDealActivities,
  getPipelineStages,
  getTeamMembers,
} from "@/lib/actions/crm";
import { DealDetail } from "./deal-detail";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function DealPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const [dealResult, activities, stages, members] = await Promise.all([
    getDealById(id),
    getDealActivities(id),
    getPipelineStages(),
    getTeamMembers(),
  ]);

  if (dealResult.error || !dealResult.deal) {
    notFound();
  }

  // Find linked prospect (for deals created from prospecting)
  let linkedProspect: { id: string; name: string; status: string } | null = null;
  const deal = dealResult.deal;
  if (deal.source === "prospecting" || deal.source === "scoring") {
    // Extract prospect name from notes or title
    const nameMatch = deal.notes?.match(/Converti depuis prospect:\s*(.+)/);
    const searchName = nameMatch?.[1]?.trim() || deal.title?.split("—")[0]?.trim();
    if (searchName) {
      const escaped = searchName.replace(/[%_\\]/g, (c: string) => `\\${c}`);
      const { data: prospect } = await supabase
        .from("prospects")
        .select("id, name, status")
        .ilike("name", `%${escaped}%`)
        .limit(1)
        .maybeSingle();
      linkedProspect = prospect;
    }
  }

  return (
    <DealDetail
      deal={deal}
      activities={activities}
      stages={stages}
      teamMembers={members}
      linkedProspect={linkedProspect}
    />
  );
}
