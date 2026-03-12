import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getMindMap } from "@/lib/actions/scripts-v2";
import { MindMapEditor } from "./mindmap-editor";

export default async function MindMapPage({
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
  const mindMap = await getMindMap(id);
  if (!mindMap) redirect("/scripts");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  return (
    <MindMapEditor
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mindMap={mindMap as any}
      userId={user.id}
      userName={profile?.full_name || "Utilisateur"}
    />
  );
}
