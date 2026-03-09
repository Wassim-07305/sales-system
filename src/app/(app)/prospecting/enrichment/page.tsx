import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProspectsForEnrichment } from "@/lib/actions/enrichment";
import { EnrichmentView } from "./enrichment-view";

export default async function EnrichmentPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const prospects = await getProspectsForEnrichment();

  return <EnrichmentView prospects={prospects} />;
}
