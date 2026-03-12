import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getScriptTemplates } from "@/lib/actions/scripts-v2";
import { TemplatesView } from "./templates-view";

export default async function TemplatesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const templates = await getScriptTemplates();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <TemplatesView templates={templates as any} />;
}
