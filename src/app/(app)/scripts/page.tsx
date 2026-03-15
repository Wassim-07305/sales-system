import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getFlowcharts, getMindMaps } from "@/lib/actions/scripts-v2";
import { ScriptsView } from "./scripts-view";

export default async function ScriptsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const flowcharts = await getFlowcharts();
  const mindMaps = await getMindMaps();

  return (
    <ScriptsView
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      scripts={[] as any}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      flowcharts={flowcharts as any}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mindMaps={mindMaps as any}
    />
  );
}
