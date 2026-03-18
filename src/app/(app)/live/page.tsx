import { getLiveSessions, getProfiles } from "@/lib/actions/live";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { LiveHubView } from "./live-hub-view";
import type { Profile } from "@/lib/types/database";

export default async function LivePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  const [sessions, profiles] = await Promise.all([
    getLiveSessions(),
    getProfiles(),
  ]);

  return (
    <LiveHubView
      sessions={sessions}
      profiles={profiles}
      currentUser={profile as Profile}
    />
  );
}
