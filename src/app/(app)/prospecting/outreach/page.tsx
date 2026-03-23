import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getTemplates, getProspects, getProspectLists } from "@/lib/actions/prospecting";
import { getDripCampaigns } from "@/lib/actions/drip-campaigns";
import {
  getSmartFollowUps,
  getFollowUpSequences,
} from "@/lib/actions/hub-setting";
import { getRelanceStats } from "@/lib/actions/automation";
import { OutreachUnifiedView } from "./outreach-unified-view";

export default async function OutreachPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

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
    <OutreachUnifiedView
      templates={templates}
      campaigns={campaigns}
      lists={lists}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tasks={tasks as any}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sequences={sequences as any}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      prospects={prospects as any}
      relanceStats={relanceStats}
    />
  );
}
