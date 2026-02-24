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

  const { data: scripts } = await supabase
    .from("scripts")
    .select("*")
    .order("created_at", { ascending: false });

  const flowcharts = await getFlowcharts();
  const mindMaps = await getMindMaps();

  return (
    <ScriptsView
      scripts={(scripts || []) as any}
      flowcharts={flowcharts as any}
      mindMaps={mindMaps as any}
    />
  );
}
