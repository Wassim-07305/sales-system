"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getCommunityPosts(type?: string, audience?: "all" | "b2b" | "b2c") {
  const supabase = await createClient();
  let query = supabase
    .from("community_posts")
    .select("*, author:profiles(id, full_name, avatar_url, niche, role)")
    .eq("hidden", false)
    .order("created_at", { ascending: false });

  if (type && type !== "all") query = query.eq("type", type);

  // Filter by audience segment (B2B vs B2C separation)
  if (audience === "b2b") {
    query = query.in("target_audience", ["b2b", "all"]);
  } else if (audience === "b2c") {
    query = query.in("target_audience", ["b2c", "all"]);
  }

  const { data } = await query;
  return (data || []).map((d: Record<string, unknown>) => ({
    ...d,
    author: Array.isArray(d.author) ? d.author[0] || null : d.author,
  }));
}

export async function createCommunityPost(formData: {
  type: string;
  title?: string;
  content: string;
  image_url?: string;
  target_audience?: "all" | "b2b" | "b2c";
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const { error } = await supabase.from("community_posts").insert({
    author_id: user.id,
    type: formData.type,
    title: formData.title || null,
    content: formData.content,
    image_url: formData.image_url || null,
    target_audience: formData.target_audience || "all",
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

export async function searchCommunity(query: string) {
  const supabase = await createClient();
  const pattern = `%${query}%`;

  const { data: posts } = await supabase
    .from("community_posts")
    .select("*, author:profiles(id, full_name, avatar_url, niche, role)")
    .eq("hidden", false)
    .or(`title.ilike.${pattern},content.ilike.${pattern}`)
    .order("created_at", { ascending: false })
    .limit(20);

  const { data: comments } = await supabase
    .from("community_comments")
    .select("*, author:profiles(id, full_name, avatar_url), post:community_posts(id, title)")
    .ilike("content", pattern)
    .order("created_at", { ascending: false })
    .limit(20);

  return {
    posts: (posts || []).map((d: Record<string, unknown>) => ({
      ...d,
      author: Array.isArray(d.author) ? d.author[0] || null : d.author,
    })),
    comments: (comments || []).map((d: Record<string, unknown>) => ({
      ...d,
      author: Array.isArray(d.author) ? d.author[0] || null : d.author,
      post: Array.isArray(d.post) ? d.post[0] || null : d.post,
    })),
  };
}

export async function getUserReputation(userId: string): Promise<number> {
  const supabase = await createClient();

  // Count posts
  const { count: postsCount } = await supabase
    .from("community_posts")
    .select("*", { count: "exact", head: true })
    .eq("author_id", userId)
    .eq("hidden", false);

  // Count bonus posts (win / success_story types)
  const { count: bonusPostsCount } = await supabase
    .from("community_posts")
    .select("*", { count: "exact", head: true })
    .eq("author_id", userId)
    .eq("hidden", false)
    .in("type", ["win", "success_story"]);

  // Count comments
  const { count: commentsCount } = await supabase
    .from("community_comments")
    .select("*", { count: "exact", head: true })
    .eq("author_id", userId);

  // Sum likes received on user's posts
  const { data: likesData } = await supabase
    .from("community_posts")
    .select("likes_count")
    .eq("author_id", userId)
    .eq("hidden", false);

  const totalLikes = (likesData || []).reduce(
    (sum: number, p: { likes_count: number | null }) => sum + (p.likes_count || 0),
    0
  );

  const score =
    (postsCount || 0) * 10 +
    (bonusPostsCount || 0) * 20 +
    (commentsCount || 0) * 5 +
    totalLikes * 3;

  return score;
}

export async function getUserReputationBatch(userIds: string[]): Promise<Record<string, number>> {
  if (userIds.length === 0) return {};
  const supabase = await createClient();

  // Get all posts by these users
  const { data: posts } = await supabase
    .from("community_posts")
    .select("author_id, likes_count, type")
    .in("author_id", userIds)
    .eq("hidden", false);

  // Get all comments by these users
  const { data: comments } = await supabase
    .from("community_comments")
    .select("author_id")
    .in("author_id", userIds);

  const scores: Record<string, number> = {};
  for (const uid of userIds) scores[uid] = 0;

  for (const post of posts || []) {
    if (!post.author_id) continue;
    scores[post.author_id] = (scores[post.author_id] || 0) + 10; // base post points
    if (post.type === "win" || post.type === "success_story") {
      scores[post.author_id] += 20; // bonus
    }
    scores[post.author_id] += (post.likes_count || 0) * 3; // likes points
  }

  for (const comment of comments || []) {
    if (!comment.author_id) continue;
    scores[comment.author_id] = (scores[comment.author_id] || 0) + 5;
  }

  return scores;
}

export async function getCommunityLeaderboard(): Promise<
  { user_id: string; full_name: string | null; avatar_url: string | null; score: number }[]
> {
  const supabase = await createClient();

  // Get all post authors with their stats
  const { data: posts } = await supabase
    .from("community_posts")
    .select("author_id, likes_count, type")
    .eq("hidden", false);

  const { data: comments } = await supabase
    .from("community_comments")
    .select("author_id");

  const scores: Record<string, number> = {};

  for (const post of posts || []) {
    if (!post.author_id) continue;
    scores[post.author_id] = (scores[post.author_id] || 0) + 10;
    if (post.type === "win" || post.type === "success_story") {
      scores[post.author_id] += 20;
    }
    scores[post.author_id] += (post.likes_count || 0) * 3;
  }

  for (const comment of comments || []) {
    if (!comment.author_id) continue;
    scores[comment.author_id] = (scores[comment.author_id] || 0) + 5;
  }

  // Sort and take top 10
  const sorted = Object.entries(scores)
    .map(([user_id, score]) => ({ user_id, score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  if (sorted.length === 0) return [];

  // Fetch profiles for top users
  const topIds = sorted.map((s) => s.user_id);
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url")
    .in("id", topIds);

  const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

  return sorted.map((s) => ({
    user_id: s.user_id,
    full_name: profileMap.get(s.user_id)?.full_name || null,
    avatar_url: profileMap.get(s.user_id)?.avatar_url || null,
    score: s.score,
  }));
}

// ─── Events & Discussions Spéciales (F36.3) ───

export interface EventMetadata {
  description: string;
  event_date: string;
  event_time: string;
  duration: number;
  location: string;
  max_participants: number;
  type: "webinar" | "ama" | "workshop" | "masterclass";
}

export async function createEvent(data: {
  title: string;
  metadata: EventMetadata;
  target_audience?: "all" | "b2b" | "b2c";
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  // Only admin / manager may create events
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin" && profile?.role !== "manager") {
    throw new Error("Accès refusé");
  }

  const { error } = await supabase.from("community_posts").insert({
    author_id: user.id,
    type: "event",
    title: data.title,
    content: JSON.stringify(data.metadata),
    target_audience: data.target_audience || "all",
    likes_count: 0,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/community/events");
  revalidatePath("/community");
}

export async function getUpcomingEvents() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("community_posts")
    .select("*, author:profiles(id, full_name, avatar_url)")
    .eq("type", "event")
    .eq("hidden", false)
    .order("created_at", { ascending: false });

  const events = (data || []).map((d: Record<string, unknown>) => ({
    ...d,
    author: Array.isArray(d.author) ? d.author[0] || null : d.author,
  }));

  // Parse metadata and split into upcoming / past based on event_date
  const now = new Date();
  const parsed = events.map((e: Record<string, unknown>) => {
    let metadata: EventMetadata | null = null;
    try {
      metadata = JSON.parse(e.content as string) as EventMetadata;
    } catch {
      metadata = null;
    }
    return { ...e, metadata };
  });

  const upcoming = parsed
    .filter((e) => {
      if (!e.metadata) return false;
      const eventDate = new Date(`${e.metadata.event_date}T${e.metadata.event_time}`);
      return eventDate >= now;
    })
    .sort((a, b) => {
      const da = new Date(`${a.metadata!.event_date}T${a.metadata!.event_time}`);
      const db = new Date(`${b.metadata!.event_date}T${b.metadata!.event_time}`);
      return da.getTime() - db.getTime();
    });

  const past = parsed
    .filter((e) => {
      if (!e.metadata) return false;
      const eventDate = new Date(`${e.metadata.event_date}T${e.metadata.event_time}`);
      return eventDate < now;
    })
    .sort((a, b) => {
      const da = new Date(`${a.metadata!.event_date}T${a.metadata!.event_time}`);
      const db = new Date(`${b.metadata!.event_date}T${b.metadata!.event_time}`);
      return db.getTime() - da.getTime();
    });

  return { upcoming, past };
}

export async function registerForEvent(eventId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  // Check if already registered (look for RSVP comment)
  const { data: existing } = await supabase
    .from("community_comments")
    .select("id")
    .eq("post_id", eventId)
    .eq("author_id", user.id)
    .eq("content", "__RSVP__");

  if (existing && existing.length > 0) {
    throw new Error("Déjà inscrit");
  }

  // Check capacity
  const { data: post } = await supabase
    .from("community_posts")
    .select("content")
    .eq("id", eventId)
    .single();
  if (!post) throw new Error("Événement introuvable");

  let metadata: EventMetadata | null = null;
  try {
    metadata = JSON.parse(post.content) as EventMetadata;
  } catch {
    throw new Error("Métadonnées invalides");
  }

  const { count } = await supabase
    .from("community_comments")
    .select("*", { count: "exact", head: true })
    .eq("post_id", eventId)
    .eq("content", "__RSVP__");

  if (metadata.max_participants && (count || 0) >= metadata.max_participants) {
    throw new Error("Événement complet");
  }

  const { error } = await supabase.from("community_comments").insert({
    post_id: eventId,
    author_id: user.id,
    content: "__RSVP__",
  });
  if (error) throw new Error(error.message);
  revalidatePath("/community/events");
}

export async function unregisterFromEvent(eventId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  await supabase
    .from("community_comments")
    .delete()
    .eq("post_id", eventId)
    .eq("author_id", user.id)
    .eq("content", "__RSVP__");

  revalidatePath("/community/events");
}

export async function getEventParticipants(eventId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("community_comments")
    .select("author:profiles(id, full_name, avatar_url)")
    .eq("post_id", eventId)
    .eq("content", "__RSVP__")
    .order("created_at");

  return (data || []).map((d: Record<string, unknown>) => {
    const author = Array.isArray(d.author) ? d.author[0] || null : d.author;
    return author as { id: string; full_name: string | null; avatar_url: string | null } | null;
  }).filter(Boolean);
}

export async function getEventParticipantCount(eventId: string): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("community_comments")
    .select("*", { count: "exact", head: true })
    .eq("post_id", eventId)
    .eq("content", "__RSVP__");
  return count || 0;
}

export async function getEventParticipantCounts(eventIds: string[]): Promise<Record<string, number>> {
  if (eventIds.length === 0) return {};
  const supabase = await createClient();
  const { data } = await supabase
    .from("community_comments")
    .select("post_id")
    .in("post_id", eventIds)
    .eq("content", "__RSVP__");

  const counts: Record<string, number> = {};
  for (const id of eventIds) counts[id] = 0;
  for (const row of data || []) {
    if (row.post_id) counts[row.post_id] = (counts[row.post_id] || 0) + 1;
  }
  return counts;
}

export async function getUserRsvps(userId: string, eventIds: string[]): Promise<Set<string>> {
  if (eventIds.length === 0) return new Set();
  const supabase = await createClient();
  const { data } = await supabase
    .from("community_comments")
    .select("post_id")
    .eq("author_id", userId)
    .in("post_id", eventIds)
    .eq("content", "__RSVP__");

  return new Set((data || []).map((d) => d.post_id).filter(Boolean));
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
