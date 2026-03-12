import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getComments, getUserReputationBatch } from "@/lib/actions/community";
import { ThreadView } from "./thread-view";

export default async function ThreadPage({
  params,
}: {
  params: Promise<{ threadId: string }>;
}) {
  const { threadId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch the post
  const { data: post } = await supabase
    .from("community_posts")
    .select("*, author:profiles(id, full_name, avatar_url, niche)")
    .eq("id", threadId)
    .single();

  if (!post) redirect("/community/forum");

  const normalizedPost = {
    ...post,
    author: Array.isArray(post.author)
      ? post.author[0] || null
      : post.author,
  };

  // Fetch comments
  const comments = await getComments(threadId);

  // Batch fetch reputations for post author + comment authors
  const authorIds = [...new Set([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (normalizedPost.author as any)?.id,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...(comments as any[]).map((c: any) => c.author?.id),
  ].filter(Boolean))] as string[];
  const reputations = await getUserReputationBatch(authorIds);

  return (
    <ThreadView
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      post={normalizedPost as any}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      comments={comments as any}
      userId={user.id}
      reputations={reputations}
    />
  );
}
