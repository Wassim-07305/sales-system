import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getMembers } from "@/lib/actions/community";
import { MembersView } from "./members-view";

export default async function MembersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const members = await getMembers();
  return <MembersView members={members} />;
}
