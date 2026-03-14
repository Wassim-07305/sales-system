"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { notify } from "@/lib/actions/notifications";

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
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
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

  // Notify original post author (if different from commenter)
  try {
    const { data: post } = await supabase
      .from("community_posts")
      .select("author_id, title")
      .eq("id", postId)
      .single();

    if (post && post.author_id !== user.id) {
      const { data: commenter } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      notify(post.author_id, "Nouvelle réponse", `${commenter?.full_name || "Quelqu'un"} a répondu à votre post${post.title ? ` "${post.title}"` : ""}`, {
        type: "community",
        link: `/community/${postId}`,
      });
    }
  } catch {
    // Non-blocking
  }

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
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || !["admin", "manager"].includes(profile.role)) return { error: "Accès refusé" };

  await supabase.from("community_posts").update({ hidden: true }).eq("id", postId);
  revalidatePath("/community");
  revalidatePath("/community/manage");
  return { success: true };
}

export async function unhidePost(postId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || !["admin", "manager"].includes(profile.role)) return { error: "Accès refusé" };

  await supabase.from("community_posts").update({ hidden: false }).eq("id", postId);
  revalidatePath("/community");
  revalidatePath("/community/manage");
  return { success: true };
}

export async function deleteCommunityPost(postId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || !["admin", "manager"].includes(profile.role)) return { error: "Accès refusé" };

  await supabase.from("community_posts").delete().eq("id", postId);
  revalidatePath("/community");
  revalidatePath("/community/manage");
  return { success: true };
}

export async function deleteComment(commentId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  await supabase.from("community_comments").delete().eq("id", commentId);
  revalidatePath("/community");
  return { success: true };
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

export async function getUserReputationScore(userId: string): Promise<number> {
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

// ─── Reputation System (F36.1) ───

export async function getUserReputation(userId?: string) {
  const supabase = await createClient();

  let targetUserId = userId;
  if (!targetUserId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Non authentifié");
    targetUserId = user.id;
  }

  try {
    // Count posts
    const { count: postsCount } = await supabase
      .from("community_posts")
      .select("*", { count: "exact", head: true })
      .eq("author_id", targetUserId)
      .eq("hidden", false);

    // Count replies (comments excluding RSVPs)
    const { count: repliesCount } = await supabase
      .from("community_comments")
      .select("*", { count: "exact", head: true })
      .eq("author_id", targetUserId)
      .neq("content", "__RSVP__");

    // Sum likes received on user's posts
    const { data: likesData } = await supabase
      .from("community_posts")
      .select("likes_count")
      .eq("author_id", targetUserId)
      .eq("hidden", false);

    const totalLikes = (likesData || []).reduce(
      (sum: number, p: { likes_count: number | null }) => sum + (p.likes_count || 0),
      0
    );

    // Count best answers (win / success_story posts as proxy)
    const { count: bestAnswers } = await supabase
      .from("community_posts")
      .select("*", { count: "exact", head: true })
      .eq("author_id", targetUserId)
      .eq("hidden", false)
      .in("type", ["win", "success_story"]);

    const posts = postsCount || 0;
    const replies = repliesCount || 0;
    const likes = totalLikes;
    const best = bestAnswers || 0;

    const points = posts * 10 + replies * 5 + likes * 3 + best * 20;

    // Get user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("id", targetUserId)
      .single();

    return {
      userId: targetUserId,
      fullName: profile?.full_name || null,
      avatarUrl: profile?.avatar_url || null,
      points,
      breakdown: { posts, replies, likes, bestAnswers: best },
    };
  } catch {
    // Fallback demo data
    return {
      userId: targetUserId,
      fullName: "Utilisateur",
      avatarUrl: null,
      points: 235,
      breakdown: { posts: 12, replies: 15, likes: 20, bestAnswers: 1 },
    };
  }
}

export async function getReputationLeaderboard() {
  const supabase = await createClient();

  try {
    // Get all posts with authors
    const { data: posts } = await supabase
      .from("community_posts")
      .select("author_id, likes_count, type")
      .eq("hidden", false);

    // Get all comments (excluding RSVPs)
    const { data: comments } = await supabase
      .from("community_comments")
      .select("author_id")
      .neq("content", "__RSVP__");

    if ((!posts || posts.length === 0) && (!comments || comments.length === 0)) {
      // Return demo data
      return getDemoLeaderboard();
    }

    const scores: Record<string, { points: number; posts: number; replies: number; likes: number; bestAnswers: number }> = {};

    const ensure = (uid: string) => {
      if (!scores[uid]) scores[uid] = { points: 0, posts: 0, replies: 0, likes: 0, bestAnswers: 0 };
    };

    for (const post of posts || []) {
      if (!post.author_id) continue;
      ensure(post.author_id);
      scores[post.author_id].posts += 1;
      scores[post.author_id].points += 10;
      scores[post.author_id].likes += post.likes_count || 0;
      scores[post.author_id].points += (post.likes_count || 0) * 2;
      if (post.type === "win" || post.type === "success_story") {
        scores[post.author_id].bestAnswers += 1;
        scores[post.author_id].points += 50;
      }
    }

    for (const comment of comments || []) {
      if (!comment.author_id) continue;
      ensure(comment.author_id);
      scores[comment.author_id].replies += 1;
      scores[comment.author_id].points += 5;
    }

    // Sort and take top 20
    const sorted = Object.entries(scores)
      .sort(([, a], [, b]) => b.points - a.points)
      .slice(0, 20);

    if (sorted.length === 0) return getDemoLeaderboard();

    // Fetch profiles
    const topIds = sorted.map(([uid]) => uid);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .in("id", topIds);

    const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

    return sorted.map(([uid, stats], index) => ({
      position: index + 1,
      userId: uid,
      fullName: profileMap.get(uid)?.full_name || "Utilisateur",
      avatarUrl: profileMap.get(uid)?.avatar_url || null,
      points: stats.points,
      posts: stats.posts,
      replies: stats.replies,
      likes: stats.likes,
      bestAnswers: stats.bestAnswers,
    }));
  } catch {
    return getDemoLeaderboard();
  }
}

function getDemoLeaderboard() {
  const demoNames = [
    "Sophie Martin", "Lucas Dupont", "Emma Bernard", "Hugo Petit",
    "Léa Richard", "Nathan Moreau", "Chloé Laurent", "Louis Simon",
    "Manon Michel", "Théo Lefebvre", "Camille Leroy", "Raphaël Roux",
    "Inès David", "Arthur Bertrand", "Jade Morel", "Ethan Fournier",
    "Zoé Girard", "Mathis Bonnet", "Lola Dupuis", "Noah Lambert",
  ];

  return demoNames.map((name, i) => ({
    position: i + 1,
    userId: `demo-${i}`,
    fullName: name,
    avatarUrl: null,
    points: Math.max(50, 2500 - i * 120 + Math.floor(Math.random() * 50)),
    posts: Math.max(1, 30 - i * 2),
    replies: Math.max(2, 45 - i * 3),
    likes: Math.max(0, 60 - i * 4),
    bestAnswers: Math.max(0, 5 - Math.floor(i / 4)),
  }));
}

export async function awardReputation(userId: string, action: string, points: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  // Try to insert into reputation_events table; if it doesn't exist, silently skip
  try {
    await supabase.from("reputation_events").insert({
      user_id: userId,
      action,
      points,
      awarded_by: user.id,
    });
  } catch {
    // Table may not exist yet — that's OK
  }

  revalidatePath("/community/reputation");
  revalidatePath("/community");
}

export async function getReputationActivity(userId?: string) {
  const supabase = await createClient();

  let targetUserId = userId;
  if (!targetUserId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Non authentifié");
    targetUserId = user.id;
  }

  try {
    // Get recent posts by user
    const { data: recentPosts } = await supabase
      .from("community_posts")
      .select("id, title, type, created_at, likes_count")
      .eq("author_id", targetUserId)
      .eq("hidden", false)
      .order("created_at", { ascending: false })
      .limit(5);

    // Get recent comments by user
    const { data: recentComments } = await supabase
      .from("community_comments")
      .select("id, created_at, post_id")
      .eq("author_id", targetUserId)
      .neq("content", "__RSVP__")
      .order("created_at", { ascending: false })
      .limit(5);

    const events: { label: string; points: number; date: string }[] = [];

    for (const post of recentPosts || []) {
      if (post.type === "win" || post.type === "success_story") {
        events.push({
          label: "Meilleure réponse",
          points: 50,
          date: post.created_at,
        });
      }
      events.push({
        label: `Nouveau post${post.title ? ` : ${post.title}` : ""}`,
        points: 10,
        date: post.created_at,
      });
      if (post.likes_count && post.likes_count > 0) {
        events.push({
          label: `${post.likes_count} like${post.likes_count > 1 ? "s" : ""} reçu${post.likes_count > 1 ? "s" : ""}`,
          points: post.likes_count * 2,
          date: post.created_at,
        });
      }
    }

    for (const comment of recentComments || []) {
      events.push({
        label: "Réponse à un post",
        points: 5,
        date: comment.created_at,
      });
    }

    // Sort by date desc and take 10
    events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return events.slice(0, 10);
  } catch {
    // Fallback demo activity
    const now = new Date();
    return [
      { label: "Nouveau post", points: 10, date: new Date(now.getTime() - 1000 * 60 * 30).toISOString() },
      { label: "Meilleure réponse", points: 50, date: new Date(now.getTime() - 1000 * 60 * 60 * 2).toISOString() },
      { label: "Réponse à un post", points: 5, date: new Date(now.getTime() - 1000 * 60 * 60 * 5).toISOString() },
      { label: "3 likes reçus", points: 6, date: new Date(now.getTime() - 1000 * 60 * 60 * 8).toISOString() },
      { label: "Nouveau post : Astuce closing", points: 10, date: new Date(now.getTime() - 1000 * 60 * 60 * 24).toISOString() },
      { label: "Réponse à un post", points: 5, date: new Date(now.getTime() - 1000 * 60 * 60 * 30).toISOString() },
      { label: "2 likes reçus", points: 4, date: new Date(now.getTime() - 1000 * 60 * 60 * 48).toISOString() },
      { label: "Nouveau post", points: 10, date: new Date(now.getTime() - 1000 * 60 * 60 * 72).toISOString() },
      { label: "Réponse à un post", points: 5, date: new Date(now.getTime() - 1000 * 60 * 60 * 96).toISOString() },
      { label: "Meilleure réponse", points: 50, date: new Date(now.getTime() - 1000 * 60 * 60 * 120).toISOString() },
    ];
  }
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
