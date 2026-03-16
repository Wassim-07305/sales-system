import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getDailyJournal, getJournalHistory } from "@/lib/actions/gamification";
import { JournalView } from "./journal-view";

export default async function JournalPage() {
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
    !["admin", "manager", "setter", "closer"].includes(profile.role)
  ) {
    redirect("/dashboard");
  }

  const [todayJournal, history] = await Promise.all([
    getDailyJournal(),
    getJournalHistory(),
  ]);

  return <JournalView todayJournal={todayJournal} history={history} />;
}
