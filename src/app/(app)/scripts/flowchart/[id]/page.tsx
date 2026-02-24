import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getFlowchart } from "@/lib/actions/scripts-v2";
import { FlowchartEditor } from "./flowchart-editor";

export default async function FlowchartPage({
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
  const flowchart = await getFlowchart(id);
  if (!flowchart) redirect("/scripts");

  return <FlowchartEditor flowchart={flowchart as any} />;
}
