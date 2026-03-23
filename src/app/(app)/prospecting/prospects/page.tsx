import { createClient } from "@/lib/supabase/server";
import {
  getProspects,
  getProspectLists,
  getProspectSegmentStats,
  getDailyQuota,
} from "@/lib/actions/prospecting";
import { ProspectsView } from "./prospects-view";

export default async function ProspectsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [prospects, lists, segmentStats, quota] = await Promise.all([
    getProspects(),
    getProspectLists(),
    getProspectSegmentStats(),
    getDailyQuota(),
  ]);

  return (
    <div className="px-6 pb-8">
      <ProspectsView
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        prospects={(prospects ?? []) as any}
        lists={lists ?? []}
        segmentStats={segmentStats}
        quota={quota}
      />
    </div>
  );
}
