import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { BrandingView } from "./branding-view";

export default async function BrandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch user profile for current branding info
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url, bio, niche")
    .eq("id", user.id)
    .single();

  return <BrandingView profile={profile as any} />;
}
