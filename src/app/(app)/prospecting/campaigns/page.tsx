import { createClient } from "@/lib/supabase/server";
import { getTemplates, getProspectLists, getProspects } from "@/lib/actions/prospecting";
import { getDripCampaigns } from "@/lib/actions/drip-campaigns";
import { getSmartFollowUps, getFollowUpSequences } from "@/lib/actions/hub-setting";
import { getRelanceStats } from "@/lib/actions/automation";
import { CampaignsPageView } from "./campaigns-page-view";

export default async function CampaignsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [templates, campaigns, lists, tasks, sequences, prospects, relanceStats] =
    await Promise.all([
      getTemplates(),
      getDripCampaigns(),
      getProspectLists(),
      getSmartFollowUps(),
      getFollowUpSequences(),
      getProspects(),
      getRelanceStats().catch(() => null),
    ]);

  return (
    <div className="pb-8">
      <CampaignsPageView
        templates={templates ?? []}
        campaigns={campaigns ?? []}
        lists={lists ?? []}
        tasks={tasks ?? []}
        sequences={sequences ?? []}
        prospects={prospects ?? []}
        relanceStats={relanceStats}
      />
    </div>
  );
}
