import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getMembers, getUserReputationBatch, getCommunityLeaderboard } from "@/lib/actions/community";
import { MembersView } from "./members-view";

export default async function MembersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [members, leaderboard] = await Promise.all([
    getMembers(),
    getCommunityLeaderboard(),
  ]);

  const memberIds = members.map((m) => m.id);
  const reputations = await getUserReputationBatch(memberIds);

  return <MembersView members={members} reputations={reputations} leaderboard={leaderboard} />;
}
