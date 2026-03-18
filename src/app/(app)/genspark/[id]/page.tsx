import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { getPresentation } from "@/lib/actions/genspark";
import { EditorView } from "./editor-view";

export default async function PresentationEditorPage({
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
  const data = await getPresentation(id);
  if (!data) notFound();

  return <EditorView presentation={data.presentation} slides={data.slides} />;
}
