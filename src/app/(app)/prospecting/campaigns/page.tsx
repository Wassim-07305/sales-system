import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getDripCampaigns } from "@/lib/actions/drip-campaigns";
import { getProspectLists, getTemplates } from "@/lib/actions/prospecting";
import { CampaignsView } from "./campaigns-view";

export default async function CampaignsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [campaigns, lists, templates] = await Promise.all([
    getDripCampaigns(),
    getProspectLists(),
    getTemplates(),
  ]);

  return (
    <CampaignsView
      campaigns={campaigns}
      lists={lists}
      templates={templates}
    />
  );
}
