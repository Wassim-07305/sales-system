import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getFlowcharts } from "@/lib/actions/scripts-v2";
import { ScriptsView } from "./scripts-view";

export default async function ScriptsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const flowcharts = await getFlowcharts();

  return (
    <ScriptsView
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      flowcharts={flowcharts as any}
    />
  );
}
