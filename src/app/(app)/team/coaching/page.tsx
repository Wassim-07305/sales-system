import { createClient } from "@/lib/supabase/server";
import { getObjectives, getDevelopmentPlan, getCoachingNotes } from "@/lib/actions/coaching";
import { getTeamMembersForFeedback } from "@/lib/actions/feedback";
import { CoachingView } from "./coaching-view";

export default async function CoachingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user!.id)
    .single();

  const userRole = profile?.role || "setter";
  const isManager = userRole === "admin" || userRole === "manager";

  const objectives = await getObjectives(user!.id);
  const plan = await getDevelopmentPlan(user!.id);
  const notes = await getCoachingNotes(user!.id);
  const members = isManager ? await getTeamMembersForFeedback() : [];

  // Default empty plan if none exists
  const defaultPlan = {
    userId: user!.id,
    skills: [],
    actions: [],
    resources: [],
  };

  return (
    <CoachingView
      objectives={objectives}
      developmentPlan={plan || defaultPlan}
      coachingNotes={notes}
      members={members}
      userRole={userRole}
      userId={user!.id}
    />
  );
}
