import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getScriptForTraining, getTrainingHistory } from "@/lib/actions/scripts-v2";
import { TrainingSession } from "./training-session";

export default async function TrainingSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const script = await getScriptForTraining(id);
  if (!script) redirect("/scripts/training");

  const history = await getTrainingHistory(id);

  return <TrainingSession script={script as any} history={history as any} />;
}
