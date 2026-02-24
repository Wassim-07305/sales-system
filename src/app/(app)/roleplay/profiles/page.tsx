import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getRoleplayProfiles } from "@/lib/actions/roleplay";
import { ProfilesView } from "./profiles-view";

export default async function ProfilesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || !["admin", "manager"].includes(profile.role)) redirect("/roleplay");

  const profiles = await getRoleplayProfiles();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <ProfilesView profiles={profiles as any} />;
}
