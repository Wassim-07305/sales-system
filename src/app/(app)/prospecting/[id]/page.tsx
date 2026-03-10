import { notFound } from "next/navigation";
import {
  getProspectById,
  getProspectScore,
  getProspectLists,
  getSettersForAssignment,
} from "@/lib/actions/prospecting";
import { getPipelineStages } from "@/lib/actions/crm";
import { ProspectDetail } from "./prospect-detail";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ProspectPage({ params }: Props) {
  const { id } = await params;

  const [prospectResult, score, lists, setters, stages] = await Promise.all([
    getProspectById(id),
    getProspectScore(id),
    getProspectLists(),
    getSettersForAssignment(),
    getPipelineStages(),
  ]);

  if (prospectResult.error || !prospectResult.prospect) {
    notFound();
  }

  return (
    <ProspectDetail
      prospect={prospectResult.prospect}
      score={score}
      lists={lists}
      setters={setters}
      stages={stages}
    />
  );
}
