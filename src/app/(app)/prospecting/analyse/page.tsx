import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { IntelligenceView } from "../intelligence/intelligence-view";
import { getCompetitors } from "@/lib/actions/intelligence";

export default async function AnalysePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const competitors = await getCompetitors();

  return <IntelligenceView competitors={competitors} />;
}
