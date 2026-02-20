import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getCommunityPosts } from "@/lib/actions/community";
import { CommunityView } from "./community-view";

export default async function CommunityPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const posts = await getCommunityPosts();
  const isAdmin = profile?.role === "admin" || profile?.role === "manager";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <CommunityView posts={posts as any} userId={user.id} isAdmin={isAdmin} />;
}
