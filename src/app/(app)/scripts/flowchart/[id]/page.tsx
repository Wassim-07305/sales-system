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

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  return (
    <FlowchartEditor
      flowchart={flowchart as any}
      userId={user.id}
      userName={profile?.full_name || "Utilisateur"}
    />
  );
}
