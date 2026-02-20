import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getContentPosts } from "@/lib/actions/content";
import { ContentView } from "./content-view";

export default async function ContentPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const posts = await getContentPosts();
  return <ContentView posts={posts} />;
}
