import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { getPresentation } from "@/lib/actions/genspark";
import { PresentView } from "./present-view";

export default async function PresentPage({
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

  return <PresentView presentation={data.presentation} slides={data.slides} />;
}
