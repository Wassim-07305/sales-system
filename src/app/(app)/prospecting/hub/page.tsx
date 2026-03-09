import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getMultiNetworkOverview } from "@/lib/actions/hub-setting";
import { HubView } from "./hub-view";

export default async function HubPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const overview = await getMultiNetworkOverview();

  return <HubView overview={overview} />;
}
