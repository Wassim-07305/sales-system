import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SegmentsView } from "./segments-view";
import { getSegments, getSegmentStats } from "@/lib/actions/segmentation";

export default async function SegmentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [segments, stats] = await Promise.all([
    getSegments(),
    getSegmentStats(),
  ]);

  return (
    <SegmentsView
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      initialSegments={segments as any}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      initialStats={stats as any}
    />
  );
}
