"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getCommunityPosts(type?: string) {
  const supabase = await createClient();
  let query = supabase
    .from("community_posts")
    .select("*, author:profiles(id, full_name, avatar_url, niche)")
    .eq("hidden", false)
    .order("created_at", { ascending: false });

  if (type && type !== "all") query = query.eq("type", type);
  const { data } = await query;
  return (data || []).map((d: Record<string, unknown>) => ({
    ...d,
    author: Array.isArray(d.author) ? d.author[0] || null : d.author,
  }));
}

export async function createCommunityPost(formData: { type: string; title?: string; content: string; image_url?: string }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const { error } = await supabase.from("community_posts").insert({
    author_id: user.id,
    type: formData.type,
    title: formData.title || null,
    content: formData.content,
    image_url: formData.image_url || null,
    likes_count: 0,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/community");
}

export async function toggleLike(postId: string, increment: boolean) {
  const supabase = await createClient();
  const { data: post } = await supabase.from("community_posts").select("likes_count").eq("id", postId).single();
  if (!post) return;
  const newCount = Math.max(0, (post.likes_count || 0) + (increment ? 1 : -1));
  await supabase.from("community_posts").update({ likes_count: newCount }).eq("id", postId);
  revalidatePath("/community");
}

export async function getComments(postId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("community_comments")
    .select("*, author:profiles(id, full_name, avatar_url)")
    .eq("post_id", postId)
    .order("created_at");
  return (data || []).map((d: Record<string, unknown>) => ({
    ...d,
    author: Array.isArray(d.author) ? d.author[0] || null : d.author,
  }));
}

export async function addComment(postId: string, content: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const { error } = await supabase.from("community_comments").insert({
    post_id: postId,
    author_id: user.id,
    content,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/community");
}

export async function getMembers(search?: string) {
  const supabase = await createClient();
  let query = supabase
    .from("profiles")
    .select("id, full_name, avatar_url, niche, created_at, role")
    .in("role", ["client_b2b", "client_b2c"])
    .order("full_name");

  if (search) query = query.ilike("full_name", `%${search}%`);
  const { data } = await query;
  return data || [];
}

export async function hidePost(postId: string) {
  const supabase = await createClient();
  await supabase.from("community_posts").update({ hidden: true }).eq("id", postId);
  revalidatePath("/community");
  revalidatePath("/community/manage");
}

export async function unhidePost(postId: string) {
  const supabase = await createClient();
  await supabase.from("community_posts").update({ hidden: false }).eq("id", postId);
  revalidatePath("/community");
  revalidatePath("/community/manage");
}

export async function deleteCommunityPost(postId: string) {
  const supabase = await createClient();
  await supabase.from("community_posts").delete().eq("id", postId);
  revalidatePath("/community");
  revalidatePath("/community/manage");
}

export async function deleteComment(commentId: string) {
  const supabase = await createClient();
  await supabase.from("community_comments").delete().eq("id", commentId);
  revalidatePath("/community");
}

export async function getAllPostsForModeration() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("community_posts")
    .select("*, author:profiles(id, full_name, avatar_url)")
    .order("created_at", { ascending: false });
  return (data || []).map((d: Record<string, unknown>) => ({
    ...d,
    author: Array.isArray(d.author) ? d.author[0] || null : d.author,
  }));
}
