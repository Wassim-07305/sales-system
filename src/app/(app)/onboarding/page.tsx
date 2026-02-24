import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { OnboardingFlow } from "./onboarding-flow";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed, role")
    .eq("id", user.id)
    .single();

  // Only clients see onboarding
  if (profile?.role && !["client_b2b", "client_b2c"].includes(profile.role)) {
    redirect("/dashboard");
  }

  if (profile?.onboarding_completed) {
    redirect("/dashboard");
  }

  const { data: steps } = await supabase
    .from("onboarding_steps")
    .select("*")
    .order("position");

  const { data: progress } = await supabase
    .from("client_onboarding")
    .select("*")
    .eq("client_id", user.id);

  const { data: quizResult } = await supabase
    .from("onboarding_quiz_responses")
    .select("score, color_code")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const progressMap: Record<string, { completed: boolean; response_data: Record<string, unknown> }> = {};
  for (const p of progress || []) {
    progressMap[p.step_id] = { completed: p.completed, response_data: p.response_data || {} };
  }

  return (
    <OnboardingFlow
      steps={steps || []}
      progressMap={progressMap}
      quizResult={quizResult}
    />
  );
}
