import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  getTeamJournals,
  getMissingEodSetters,
} from "@/lib/actions/gamification";
import { TeamJournalView } from "./team-journal-view";

export default async function TeamJournalPage() {
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

  if (!profile || !["admin", "manager", "client_b2b"].includes(profile.role)) {
    redirect("/dashboard");
  }

  const [journals, missing] = await Promise.all([
    getTeamJournals(),
    getMissingEodSetters(),
  ]);

  return <TeamJournalView journals={journals} missingSetters={missing} />;
}
