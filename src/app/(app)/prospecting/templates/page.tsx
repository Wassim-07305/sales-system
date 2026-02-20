import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getTemplates } from "@/lib/actions/prospecting";
import { TemplatesView } from "./templates-view";

export default async function TemplatesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const templates = await getTemplates();
  return <TemplatesView templates={templates} />;
}
