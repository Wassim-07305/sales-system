import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { UserDetail } from "./user-detail";
import { getClientTimeline } from "@/lib/actions/timeline";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function UserPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: user } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single();

  if (!user) notFound();

  const [dealsResult, timelineEvents] = await Promise.all([
    supabase
      .from("deals")
      .select("*, stage:pipeline_stages(*)")
      .eq("contact_id", id)
      .order("created_at", { ascending: false }),
    getClientTimeline(id, 50),
  ]);

  const deals = dealsResult.data || [];

  const { data: activities } = await supabase
    .from("deal_activities")
    .select("*, user:profiles(*)")
    .in(
      "deal_id",
      deals.map((d) => d.id).length > 0 ? deals.map((d) => d.id) : ["none"],
    )
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <UserDetail
      user={user}
      deals={deals}
      activities={activities || []}
      timelineEvents={timelineEvents}
    />
  );
}
