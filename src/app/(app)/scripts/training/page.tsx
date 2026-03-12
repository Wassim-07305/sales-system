import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getScriptsForTraining, getTrainingHistory } from "@/lib/actions/scripts-v2";
import { TrainingView } from "./training-view";

export default async function ScriptTrainingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const scripts = await getScriptsForTraining();
  const history = await getTrainingHistory();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <TrainingView scripts={scripts as any} history={history as any} />;
}
