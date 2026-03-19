import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  getSmartFollowUps,
  getFollowUpSequences,
} from "@/lib/actions/hub-setting";
import { getProspects } from "@/lib/actions/prospecting";
import { getRelanceStats } from "@/lib/actions/automation";
import { FollowUpsView } from "./follow-ups-view";

export default async function FollowUpsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [tasks, sequences, prospects, relanceStats] = await Promise.all([
    getSmartFollowUps(),
    getFollowUpSequences(),
    getProspects(),
    getRelanceStats().catch(() => null),
  ]);

  return (
    <FollowUpsView
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
