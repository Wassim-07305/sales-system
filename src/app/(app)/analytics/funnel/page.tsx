import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getFunnelData } from "@/lib/actions/analytics";
import { FunnelView } from "./funnel-view";

export default async function FunnelPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const funnelData = await getFunnelData();
  return <FunnelView data={funnelData} />;
}
