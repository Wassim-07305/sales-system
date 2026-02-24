import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getAiModeConfig } from "@/lib/actions/ai-modes";
import { AiModesView } from "./ai-modes-view";

export default async function AiModesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const config = await getAiModeConfig();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <AiModesView config={config as any} />;
}
