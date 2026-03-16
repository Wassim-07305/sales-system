import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getAllPostsForModeration } from "@/lib/actions/community";
import { ManageView } from "./manage-view";

export default async function ManagePage() {
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
  if (!profile || !["admin", "manager"].includes(profile.role))
    redirect("/community");

  const posts = await getAllPostsForModeration();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <ManageView posts={posts as any} />;
}
