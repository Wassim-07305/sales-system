import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  getUserReputation,
  getReputationLeaderboard,
  getReputationActivity,
} from "@/lib/actions/community";
import { ReputationView } from "./reputation-view";

export default async function ReputationPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [userReputation, leaderboard, activity] = await Promise.all([
    getUserReputation(user.id),
    getReputationLeaderboard(),
    getReputationActivity(user.id),
  ]);

  return (
    <ReputationView
      userReputation={userReputation}
      leaderboard={leaderboard}
      activity={activity}
    />
  );
}
