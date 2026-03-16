import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  getMultiNetworkOverview,
  getHubUnifiedStats,
} from "@/lib/actions/hub-setting";
import { HubView } from "./hub-view";

export default async function HubPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [overview, unifiedStats] = await Promise.all([
    getMultiNetworkOverview(),
    getHubUnifiedStats(),
  ]);

  return <HubView overview={overview} whatsappStats={unifiedStats.whatsapp} />;
}
