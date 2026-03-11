import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingFlow } from "./onboarding-flow";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, onboarding_completed")
    .eq("id", user.id)
    .single();

  // If already completed, redirect to dashboard
  if (profile?.onboarding_completed) redirect("/dashboard");

  const role = profile?.role || "client_b2c";

  // Only clients go through onboarding
  if (role !== "client_b2b" && role !== "client_b2c") redirect("/dashboard");

  return <OnboardingFlow role={role} userId={user.id} />;
}
