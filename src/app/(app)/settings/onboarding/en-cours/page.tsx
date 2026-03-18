import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { OnboardingsEnCours } from "./onboardings-en-cours";

export default async function OnboardingsEnCoursPage() {
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

  if (profile?.role !== "admin" && profile?.role !== "manager")
    redirect("/dashboard");

  const { data: users } = await supabase
    .from("profiles")
    .select(
      "id, full_name, email, role, onboarding_step, onboarding_completed, updated_at",
    )
    .eq("onboarding_completed", false)
    .order("updated_at", { ascending: false });

  return <OnboardingsEnCours users={users || []} />;
}
