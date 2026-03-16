import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  getAllPostsForModeration,
  getReports,
  getCommunityBans,
  getModerationLogs,
  getCommunityMembers,
  getPendingReportsCount,
} from "@/lib/actions/community";
import { ManageView } from "./manage-view";

export default async function ManagePage() {
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
  if (!profile || !["admin", "manager"].includes(profile.role))
    redirect("/community");

  const [posts, reports, bans, logs, members, pendingReportsCount] =
    await Promise.all([
      getAllPostsForModeration(),
      getReports(),
      getCommunityBans(),
      getModerationLogs(),
      getCommunityMembers(),
      getPendingReportsCount(),
    ]);

  return (
    <ManageView
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      posts={posts as any}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      reports={reports as any}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      bans={bans as any}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      logs={logs as any}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      members={members as any}
      pendingReportsCount={pendingReportsCount}
    />
  );
}
