import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PublicProfileView } from "./public-profile-view";

interface Props {
  params: Promise<{ userId: string }>;
}

export default async function PublicProfilePage({ params }: Props) {
  const { userId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch the target user's profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (!profile) redirect("/dashboard");

  // Fetch gamification profile
  const { data: gamProfile } = await supabase
    .from("gamification_profiles")
    .select("*")
    .eq("user_id", userId)
    .single();

  // Fetch deal stats
  const { count: dealCount } = await supabase
    .from("deals")
    .select("*", { count: "exact", head: true })
    .eq("assigned_to", userId);

  // Fetch completed calls
  const { count: callCount } = await supabase
    .from("bookings")
    .select("*", { count: "exact", head: true })
    .eq("status", "completed");

  return (
    <PublicProfileView
      profile={profile}
      gamProfile={gamProfile}
      dealCount={dealCount || 0}
      callCount={callCount || 0}
    />
  );
}
