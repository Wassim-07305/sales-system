import { notFound } from "next/navigation";
import { getDealById, getDealActivities, getPipelineStages, getTeamMembers } from "@/lib/actions/crm";
import { DealDetail } from "./deal-detail";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function DealPage({ params }: Props) {
  const { id } = await params;

  const [dealResult, activities, stages, members] = await Promise.all([
    getDealById(id),
    getDealActivities(id),
    getPipelineStages(),
    getTeamMembers(),
  ]);

  if (dealResult.error || !dealResult.deal) {
    notFound();
  }

  return (
    <DealDetail
      deal={dealResult.deal}
      activities={activities}
      stages={stages}
      teamMembers={members}
    />
  );
}
