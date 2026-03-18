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
    .select("role, onboarding_completed, full_name, onboarding_step")
    .eq("id", user.id)
    .single();

  if (profile?.onboarding_completed) redirect("/dashboard");

  const role = profile?.role || "client_b2c";
  if (role !== "client_b2b" && role !== "client_b2c") redirect("/dashboard");

  return (
    <OnboardingFlow
      role={role}
      userId={user.id}
      userName={profile?.full_name || undefined}
      savedStep={profile?.onboarding_step || 0}
    />
  );
}
