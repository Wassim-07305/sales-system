import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getRoleplayProfiles, getUserSessions } from "@/lib/actions/roleplay";
import { RoleplayView } from "./roleplay-view";

export default async function RoleplayPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profiles = await getRoleplayProfiles();
  const sessions = await getUserSessions(user.id);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <RoleplayView profiles={profiles as any} sessions={sessions as any} />;
}
