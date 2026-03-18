import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  getPresentations,
  getPresentationTemplates,
} from "@/lib/actions/genspark";
import { GensparkView } from "./genspark-view";

export default async function GensparkPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [presentations, templates] = await Promise.all([
    getPresentations(),
    getPresentationTemplates(),
  ]);

  return <GensparkView presentations={presentations} templates={templates} />;
}
