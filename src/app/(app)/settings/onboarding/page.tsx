import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { OnboardingSettings } from "./onboarding-settings";

export default async function OnboardingSettingsPage() {
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

  if (profile?.role !== "admin") redirect("/dashboard");

  const { data: steps } = await supabase
    .from("onboarding_steps")
    .select("*")
    .order("position");

  return <OnboardingSettings steps={steps || []} />;
}
