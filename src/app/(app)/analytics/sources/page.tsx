import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getSourceData } from "@/lib/actions/analytics";
import { SourcesView } from "./sources-view";

export default async function SourcesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const sourceData = await getSourceData();
  return <SourcesView data={sourceData} />;
}
