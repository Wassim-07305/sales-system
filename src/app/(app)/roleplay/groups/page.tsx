import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  getTrainingGroups,
  getTeamMembers,
} from "@/lib/actions/group-training";
import { GroupsView } from "./groups-view";

export default async function GroupsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [groups, teamMembers] = await Promise.all([
    getTrainingGroups(),
    getTeamMembers(),
  ]);

  return (
    <GroupsView
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      groups={groups as any}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      teamMembers={teamMembers as any}
    />
  );
}
