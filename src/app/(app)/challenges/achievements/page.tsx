import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getAchievements } from "@/lib/actions/gamification";
import { AchievementsView } from "./achievements-view";

export default async function AchievementsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { achievements, totalPoints } = await getAchievements();

  return (
    <AchievementsView
      achievements={achievements}
      totalPoints={totalPoints}
    />
  );
}
