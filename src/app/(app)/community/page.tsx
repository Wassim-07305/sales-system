import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  getCommunityPosts,
  getCommunityLeaderboard,
  getUserReputationBatch,
  getCommunityChannelCounts,
  getPendingReportsCount,
} from "@/lib/actions/community";
import { CommunityView } from "./community-view";

export default async function CommunityPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (
    !profile ||
    ![
      "admin",
      "manager",
      "client_b2b",
      "client_b2c",
      "setter",
      "closer",
    ].includes(profile.role)
  ) {
    redirect("/dashboard");
  }

  const [posts, leaderboard, channelCounts, pendingReportsCount] =
    await Promise.all([
      getCommunityPosts(),
      getCommunityLeaderboard(),
      getCommunityChannelCounts(),
      getPendingReportsCount(),
    ]);

  const isAdmin = profile?.role === "admin" || profile?.role === "manager";
  const userRole = profile?.role || "client_b2c";

  // Collect unique author IDs from posts for batch reputation lookup
  const authorIds = [
    ...new Set(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (posts as any[]).map((p: any) => p.author?.id).filter(Boolean),
    ),
  ] as string[];
  const reputations = await getUserReputationBatch(authorIds);

  return (
    <CommunityView
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      posts={posts as any}
      userId={user.id}
      isAdmin={isAdmin}
      leaderboard={leaderboard}
      reputations={reputations}
      userRole={userRole}
      channelCounts={channelCounts}
      pendingReportsCount={isAdmin ? pendingReportsCount : 0}
    />
  );
}
