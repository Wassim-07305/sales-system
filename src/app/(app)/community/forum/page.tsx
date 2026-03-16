import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getUserReputationBatch } from "@/lib/actions/community";
import { ForumView } from "./forum-view";

export default async function ForumPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch forum posts (posts associated with modules)
  const { data: posts } = await supabase
    .from("community_posts")
    .select("*, author:profiles(id, full_name, avatar_url, niche)")
    .eq("hidden", false)
    .not("module_id", "is", null)
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false });

  const normalizedPosts = (posts || []).map((d: Record<string, unknown>) => ({
    ...d,
    author: Array.isArray(d.author) ? d.author[0] || null : d.author,
  }));

  // Fetch modules for category filtering
  const { data: modules } = await supabase
    .from("modules")
    .select("id, title")
    .order("order_index");

  // Batch fetch reputations for post authors
  const authorIds = [
    ...new Set(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      normalizedPosts.map((p: any) => (p.author as any)?.id).filter(Boolean),
    ),
  ] as string[];
  const reputations = await getUserReputationBatch(authorIds);

  return (
    <ForumView
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      posts={normalizedPosts as any}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      modules={(modules || []) as any}
      userId={user.id}
      reputations={reputations}
    />
  );
}
