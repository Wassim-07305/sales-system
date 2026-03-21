import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getProspectPostsFeed } from "@/lib/actions/linkhub";
import { LinkHubView } from "./linkhub-view";

export default async function LinkHubPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Charger les prospects pour le sélecteur de sourcing
  const { data: prospects } = await supabase
    .from("prospects")
    .select("id, full_name, profile_url, platform, status")
    .eq("user_id", user.id)
    .not("profile_url", "is", null)
    .order("created_at", { ascending: false });

  const { posts, stats } = await getProspectPostsFeed();

  return (
    <LinkHubView
      initialPosts={posts}
      initialStats={stats}
      prospects={prospects || []}
    />
  );
}
