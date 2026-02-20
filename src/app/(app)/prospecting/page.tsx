import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getProspects, getDailyQuota, getProspectLists } from "@/lib/actions/prospecting";
import { ProspectingView } from "./prospecting-view";

export default async function ProspectingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const prospects = await getProspects();
  const quota = await getDailyQuota();
  const lists = await getProspectLists();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <ProspectingView prospects={prospects as any} quota={quota} lists={lists} />;
}
