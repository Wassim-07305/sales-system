import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SubscriptionView } from "./subscription-view";

export default async function SubscriptionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch current user profile for subscription info
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, subscription_tier")
    .eq("id", user.id)
    .single();

  const currentTier = profile?.subscription_tier || "free";

  return <SubscriptionView currentTier={currentTier} />;
}
