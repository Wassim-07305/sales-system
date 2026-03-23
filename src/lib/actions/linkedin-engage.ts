"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { aiJSON, aiComplete, SMART_MODEL } from "@/lib/ai/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LinkedInFeed {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  profiles_count?: number;
}

export interface FeedProfile {
  id: string;
  feed_id: string;
  linkedin_profile_url: string;
  full_name: string | null;
  job_title: string | null;
  photo_url: string | null;
  linkedin_user_id: string | null;
  is_active: boolean;
  added_at: string;
}

export interface FeedPost {
  id: string;
  feed_id: string;
  profile_id: string;
  linkedin_post_id: string | null;
  content_text: string | null;
  post_url: string | null;
  post_image_url: string | null;
  likes_count: number;
  comments_count: number;
  published_at: string | null;
  scraped_at: string;
  // Joined profile data
  profile?: FeedProfile;
  // AI comments for this post
  ai_comments?: AiComment[];
}

export interface AiComment {
  id: string;
  user_id: string;
  post_id: string;
  comment_text: string;
  comment_type: "value" | "question" | "story";
  status: "generated" | "modified" | "published" | "ignored";
  published_at: string | null;
  created_at: string;
}

export interface CommentHistory {
  id: string;
  user_id: string;
  post_id: string | null;
  linkedin_post_id: string | null;
  post_url: string | null;
  creator_name: string | null;
  comment_text: string;
  impressions: number;
  replies_count: number;
  likes_on_comment: number;
  posted_at: string;
}

export interface StyleSample {
  id: string;
  user_id: string;
  example_comment: string;
  added_at: string;
}

export interface LinkedInSession {
  id: string;
  user_id: string;
  duration_seconds: number;
  comments_posted: number;
  feeds_browsed: number;
  profiles_engaged: number;
  started_at: string;
  ended_at: string | null;
}

export interface RewriteOption {
  id: string;
  user_id: string;
  name: string;
  instruction: string;
  created_at: string;
}

export interface Recommendation {
  id: string;
  user_id: string;
  profile_name: string;
  profile_title: string | null;
  profile_url: string | null;
  profile_photo_url: string | null;
  reason: string;
  score: number;
  generated_at: string;
}

export interface EngageStats {
  commentsToday: number;
  commentsThisMonth: number;
  profilesEngagedToday: number;
  unreadReplies: number;
  totalImpressions: number;
  avgRepliesRate: number;
  bestHour: number | null;
  dailyGoal: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function requireAuth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");
  return { supabase, user };
}

const REVALIDATE_PATH = "/prospecting/engage";

// ---------------------------------------------------------------------------
// FEEDS — CRUD
// ---------------------------------------------------------------------------

export async function getFeeds(): Promise<LinkedInFeed[]> {
  const { supabase, user } = await requireAuth();

  const { data: feeds } = await supabase
    .from("linkedin_feeds")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (!feeds) return [];

  // Count profiles per feed
  const feedIds = feeds.map((f) => f.id);
  const { data: profileCounts } = await supabase
    .from("linkedin_feed_profiles")
    .select("feed_id")
    .in("feed_id", feedIds)
    .eq("is_active", true);

  const countMap: Record<string, number> = {};
  (profileCounts || []).forEach((p) => {
    countMap[p.feed_id] = (countMap[p.feed_id] || 0) + 1;
  });

  return feeds.map((f) => ({
    ...f,
    profiles_count: countMap[f.id] || 0,
  }));
}

export async function createFeed(
  name: string,
  description?: string,
): Promise<LinkedInFeed | null> {
  const { supabase, user } = await requireAuth();

  const { data, error } = await supabase
    .from("linkedin_feeds")
    .insert({
      user_id: user.id,
      name,
      description: description || null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath(REVALIDATE_PATH);
  return data;
}

export async function updateFeed(
  feedId: string,
  updates: { name?: string; description?: string; is_active?: boolean },
): Promise<void> {
  const { supabase } = await requireAuth();

  const { error } = await supabase
    .from("linkedin_feeds")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", feedId);

  if (error) throw new Error(error.message);
  revalidatePath(REVALIDATE_PATH);
}

export async function deleteFeed(feedId: string): Promise<void> {
  const { supabase } = await requireAuth();

  const { error } = await supabase
    .from("linkedin_feeds")
    .delete()
    .eq("id", feedId);

  if (error) throw new Error(error.message);
  revalidatePath(REVALIDATE_PATH);
}

// ---------------------------------------------------------------------------
// FEED PROFILES — Add/Remove profiles from feeds
// ---------------------------------------------------------------------------

export async function getFeedProfiles(feedId: string): Promise<FeedProfile[]> {
  const { supabase } = await requireAuth();

  const { data } = await supabase
    .from("linkedin_feed_profiles")
    .select("*")
    .eq("feed_id", feedId)
    .eq("is_active", true)
    .order("added_at", { ascending: false });

  return (data || []) as FeedProfile[];
}

export async function addProfileToFeed(
  feedId: string,
  profileUrl: string,
): Promise<FeedProfile | null> {
  const { supabase } = await requireAuth();

  // Normalize URL
  const cleanUrl = profileUrl.trim().replace(/\/+$/, "");

  // Try to resolve profile info via Unipile or Apify
  let fullName: string | null = null;
  let jobTitle: string | null = null;
  let photoUrl: string | null = null;

  try {
    const { getLinkedInProfileViaUnipile } = await import(
      "@/lib/actions/unipile"
    );
    const { getUnipileStatus } = await import("@/lib/actions/unipile");
    const status = await getUnipileStatus();
    const linkedinAccount = status.accounts.find(
      (a) => a.channel === "linkedin",
    );

    if (linkedinAccount) {
      const result = await getLinkedInProfileViaUnipile(
        linkedinAccount.id,
        cleanUrl,
      );
      if (result.data) {
        fullName = result.data.name;
        jobTitle = result.data.headline;
      }
    }
  } catch {
    // Fallback: try Apify
    try {
      const { callApifyActor } = await import("@/lib/apify");
      const results = await callApifyActor<{
        fullName?: string;
        headline?: string;
        profilePicture?: string;
      }>("dev_fusion/Linkedin-Profile-Scraper", {
        profileUrls: [cleanUrl],
      });
      if (results && results[0]) {
        fullName = results[0].fullName || null;
        jobTitle = results[0].headline || null;
        photoUrl = results[0].profilePicture || null;
      }
    } catch {
      // Extract name from URL as last resort
      const vanity = cleanUrl.match(/linkedin\.com\/in\/([^/?#]+)/)?.[1];
      if (vanity) {
        fullName = vanity.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      }
    }
  }

  const { data, error } = await supabase
    .from("linkedin_feed_profiles")
    .upsert(
      {
        feed_id: feedId,
        linkedin_profile_url: cleanUrl,
        full_name: fullName,
        job_title: jobTitle,
        photo_url: photoUrl,
      },
      { onConflict: "feed_id,linkedin_profile_url" },
    )
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath(REVALIDATE_PATH);
  return data as FeedProfile;
}

export async function removeProfileFromFeed(profileId: string): Promise<void> {
  const { supabase } = await requireAuth();

  const { error } = await supabase
    .from("linkedin_feed_profiles")
    .update({ is_active: false })
    .eq("id", profileId);

  if (error) throw new Error(error.message);
  revalidatePath(REVALIDATE_PATH);
}

// ---------------------------------------------------------------------------
// FEED POSTS — Fetch & Refresh
// ---------------------------------------------------------------------------

export async function getFeedPosts(
  feedId: string,
  limit = 50,
): Promise<FeedPost[]> {
  const { supabase, user } = await requireAuth();

  const { data } = await supabase
    .from("linkedin_feed_posts")
    .select(
      "*, profile:linkedin_feed_profiles(*)",
    )
    .eq("feed_id", feedId)
    .order("published_at", { ascending: false })
    .limit(limit);

  if (!data) return [];

  // Fetch AI comments for these posts
  const postIds = data.map((p) => p.id);
  const { data: comments } = await supabase
    .from("linkedin_ai_comments")
    .select("*")
    .in("post_id", postIds)
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  const commentMap: Record<string, AiComment[]> = {};
  (comments || []).forEach((c) => {
    if (!commentMap[c.post_id]) commentMap[c.post_id] = [];
    commentMap[c.post_id].push(c as AiComment);
  });

  return data.map((p) => ({
    ...p,
    ai_comments: commentMap[p.id] || [],
  })) as FeedPost[];
}

export async function getAllFeedPosts(limit = 50): Promise<FeedPost[]> {
  const { supabase, user } = await requireAuth();

  // Get user's feed IDs
  const { data: feeds } = await supabase
    .from("linkedin_feeds")
    .select("id")
    .eq("user_id", user.id)
    .eq("is_active", true);

  if (!feeds || feeds.length === 0) return [];

  const feedIds = feeds.map((f) => f.id);

  const { data } = await supabase
    .from("linkedin_feed_posts")
    .select(
      "*, profile:linkedin_feed_profiles(*)",
    )
    .in("feed_id", feedIds)
    .order("published_at", { ascending: false })
    .limit(limit);

  if (!data) return [];

  // Fetch AI comments
  const postIds = data.map((p) => p.id);
  if (postIds.length === 0) return data as FeedPost[];

  const { data: comments } = await supabase
    .from("linkedin_ai_comments")
    .select("*")
    .in("post_id", postIds)
    .eq("user_id", user.id);

  const commentMap: Record<string, AiComment[]> = {};
  (comments || []).forEach((c) => {
    if (!commentMap[c.post_id]) commentMap[c.post_id] = [];
    commentMap[c.post_id].push(c as AiComment);
  });

  return data.map((p) => ({
    ...p,
    ai_comments: commentMap[p.id] || [],
  })) as FeedPost[];
}

export async function refreshFeedPosts(feedId: string): Promise<number> {
  const { supabase } = await requireAuth();

  // Get active profiles
  const { data: profiles } = await supabase
    .from("linkedin_feed_profiles")
    .select("*")
    .eq("feed_id", feedId)
    .eq("is_active", true);

  if (!profiles || profiles.length === 0) return 0;

  let totalInserted = 0;

  try {
    const { callApifyActor } = await import("@/lib/apify");

    for (const profile of profiles) {
      try {
        const results = await callApifyActor<{
          url?: string;
          text?: string;
          likesCount?: number;
          commentsCount?: number;
          postedAt?: string;
          imageUrl?: string;
          postId?: string;
        }>("dev_fusion/Linkedin-Posts-Scraper", {
          profileUrls: [profile.linkedin_profile_url],
          maxPosts: 20,
        });

        if (!results) continue;

        for (const post of results) {
          if (!post.url && !post.text) continue;

          const { error } = await supabase
            .from("linkedin_feed_posts")
            .upsert(
              {
                feed_id: feedId,
                profile_id: profile.id,
                linkedin_post_id: post.postId || null,
                content_text: post.text || null,
                post_url: post.url || null,
                post_image_url: post.imageUrl || null,
                likes_count: post.likesCount || 0,
                comments_count: post.commentsCount || 0,
                published_at: post.postedAt || new Date().toISOString(),
                scraped_at: new Date().toISOString(),
              },
              { onConflict: "feed_id,post_url", ignoreDuplicates: true },
            );

          if (!error) totalInserted++;
        }
      } catch (err) {
        console.error(`Error scraping ${profile.linkedin_profile_url}:`, err);
      }
    }
  } catch (err) {
    console.error("Apify import error:", err);
    throw new Error("Impossible de charger le module de scraping");
  }

  revalidatePath(REVALIDATE_PATH);
  return totalInserted;
}

// ---------------------------------------------------------------------------
// AI COMMENTS — Generate, update status
// ---------------------------------------------------------------------------

export async function generateAiComments(
  postId: string,
): Promise<AiComment[]> {
  const { supabase, user } = await requireAuth();

  // Get post content
  const { data: post } = await supabase
    .from("linkedin_feed_posts")
    .select("*, profile:linkedin_feed_profiles(*)")
    .eq("id", postId)
    .single();

  if (!post) throw new Error("Post introuvable");

  // Get user's style samples
  const { data: samples } = await supabase
    .from("linkedin_style_samples")
    .select("example_comment")
    .eq("user_id", user.id)
    .order("added_at", { ascending: false })
    .limit(5);

  // Get user's sector from profile
  const { data: userProfile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  const styleSamples = (samples || []).map((s) => s.example_comment);
  const styleContext =
    styleSamples.length > 0
      ? `Voici des exemples de commentaires du setter pour t'inspirer de son style :\n${styleSamples.map((s, i) => `${i + 1}. "${s}"`).join("\n")}`
      : "Aucun exemple de style fourni. Utilise un ton professionnel, naturel et engageant.";

  const profileData = post.profile as FeedProfile | null;

  const prompt = `Tu es un expert en personal branding LinkedIn. Génère 3 commentaires LinkedIn différents pour ce post.

POST DE : ${profileData?.full_name || "Créateur LinkedIn"}${profileData?.job_title ? ` (${profileData.job_title})` : ""}
TEXTE DU POST : ${post.content_text || "[Post sans texte — probablement une image ou vidéo]"}

STYLE DU SETTER : ${styleContext}

INSTRUCTIONS :
- Commentaire 1 (type "value") : Apporte de la valeur et une perspective nouvelle. Partage un insight ou un complément pertinent.
- Commentaire 2 (type "question") : Pose une question engageante qui invite à la discussion.
- Commentaire 3 (type "story") : Partage une expérience personnelle courte et pertinente.

CONTRAINTES :
- Chaque commentaire fait entre 2 et 5 lignes.
- Pas d'emojis excessifs (1-2 maximum).
- Ton naturel et non commercial.
- Ne commence jamais par "Super post !" ou "Merci pour ce partage" ou toute formule générique.
- Pas de hashtags.

Réponds en JSON : { "comments": [{ "type": "value", "text": "..." }, { "type": "question", "text": "..." }, { "type": "story", "text": "..." }] }`;

  const result = await aiJSON<{
    comments: Array<{ type: string; text: string }>;
  }>(prompt, {
    model: SMART_MODEL,
    maxTokens: 1000,
  });

  // Save to DB
  const inserts = (result.comments || []).map((c) => ({
    user_id: user.id,
    post_id: postId,
    comment_text: c.text,
    comment_type: c.type as "value" | "question" | "story",
    status: "generated" as const,
  }));

  // Delete previous generated comments for this post
  await supabase
    .from("linkedin_ai_comments")
    .delete()
    .eq("post_id", postId)
    .eq("user_id", user.id)
    .eq("status", "generated");

  const { data: saved } = await supabase
    .from("linkedin_ai_comments")
    .insert(inserts)
    .select();

  revalidatePath(REVALIDATE_PATH);
  return (saved || []) as AiComment[];
}

export async function updateAiComment(
  commentId: string,
  updates: { comment_text?: string; status?: string },
): Promise<void> {
  const { supabase } = await requireAuth();

  const updateData: Record<string, unknown> = {};
  if (updates.comment_text) updateData.comment_text = updates.comment_text;
  if (updates.status) {
    updateData.status = updates.status;
    if (updates.status === "published") {
      updateData.published_at = new Date().toISOString();
    }
  }

  const { error } = await supabase
    .from("linkedin_ai_comments")
    .update(updateData)
    .eq("id", commentId);

  if (error) throw new Error(error.message);
  revalidatePath(REVALIDATE_PATH);
}

// ---------------------------------------------------------------------------
// PUBLISH COMMENT — via Unipile LinkedIn API
// ---------------------------------------------------------------------------

export async function publishComment(
  commentId: string,
  postUrl: string,
  commentText: string,
  creatorName: string,
): Promise<{ success: boolean; error?: string }> {
  const { supabase, user } = await requireAuth();

  try {
    // Try to publish via Unipile REST API
    const dsn = process.env.UNIPILE_DSN;
    const apiKey = process.env.UNIPILE_API_KEY;

    if (!dsn || !apiKey) {
      return { success: false, error: "Unipile non configuré. Configurez UNIPILE_DSN et UNIPILE_API_KEY." };
    }

    // Extract LinkedIn post URN from URL if possible
    const postUrnMatch = postUrl?.match(/activity[:-](\d+)/);
    const postUrn = postUrnMatch
      ? `urn:li:activity:${postUrnMatch[1]}`
      : null;

    if (!postUrn) {
      // Fallback: copy to clipboard mode — mark as published anyway
      // (The user will paste it manually)
      await supabase
        .from("linkedin_ai_comments")
        .update({
          status: "published",
          published_at: new Date().toISOString(),
        })
        .eq("id", commentId);

      // Log in history
      await supabase.from("linkedin_comment_history").insert({
        user_id: user.id,
        linkedin_post_id: null,
        post_url: postUrl,
        creator_name: creatorName,
        comment_text: commentText,
      });

      revalidatePath(REVALIDATE_PATH);
      return {
        success: true,
        error: "Publication automatique impossible (format d'URL non reconnu). Le commentaire a été marqué comme publié — collez-le manuellement sur LinkedIn.",
      };
    }

    // Find LinkedIn account
    const { getUnipileStatus } = await import("@/lib/actions/unipile");
    const status = await getUnipileStatus();
    const liAccount = status.accounts.find((a) => a.channel === "linkedin");

    if (!liAccount) {
      return { success: false, error: "Aucun compte LinkedIn connecté via Unipile." };
    }

    // Post comment via Unipile REST API
    const res = await fetch(`${dsn}/api/v1/posts/${postUrn}/comments`, {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        account_id: liAccount.id,
        text: commentText,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      // Still mark as published since user might paste manually
      await supabase
        .from("linkedin_ai_comments")
        .update({ status: "published", published_at: new Date().toISOString() })
        .eq("id", commentId);

      await supabase.from("linkedin_comment_history").insert({
        user_id: user.id,
        linkedin_post_id: postUrn,
        post_url: postUrl,
        creator_name: creatorName,
        comment_text: commentText,
      });

      revalidatePath(REVALIDATE_PATH);
      return {
        success: false,
        error: `Erreur Unipile: ${errText}. Le commentaire a été copié — collez-le manuellement.`,
      };
    }

    // Success — update comment status and log
    await supabase
      .from("linkedin_ai_comments")
      .update({ status: "published", published_at: new Date().toISOString() })
      .eq("id", commentId);

    await supabase.from("linkedin_comment_history").insert({
      user_id: user.id,
      linkedin_post_id: postUrn,
      post_url: postUrl,
      creator_name: creatorName,
      comment_text: commentText,
    });

    revalidatePath(REVALIDATE_PATH);
    return { success: true };
  } catch (err) {
    console.error("Publish comment error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erreur lors de la publication",
    };
  }
}

// ---------------------------------------------------------------------------
// REWRITE — AI-powered comment rewriting
// ---------------------------------------------------------------------------

export async function rewriteComment(
  commentText: string,
  instruction: string,
): Promise<string> {
  await requireAuth();

  const prompt = `Tu es un expert LinkedIn. Réécris ce commentaire selon l'instruction donnée.

COMMENTAIRE ACTUEL :
${commentText}

INSTRUCTION : ${instruction}

Réponds UNIQUEMENT avec le commentaire réécrit, sans guillemets, sans explication.`;

  const result = await aiComplete(prompt, {
    model: SMART_MODEL,
    maxTokens: 500,
    temperature: 0.7,
  });

  return result.trim();
}

// ---------------------------------------------------------------------------
// STYLE SAMPLES — CRUD
// ---------------------------------------------------------------------------

export async function getStyleSamples(): Promise<StyleSample[]> {
  const { supabase, user } = await requireAuth();

  const { data } = await supabase
    .from("linkedin_style_samples")
    .select("*")
    .eq("user_id", user.id)
    .order("added_at", { ascending: false });

  return (data || []) as StyleSample[];
}

export async function addStyleSample(
  exampleComment: string,
): Promise<StyleSample | null> {
  const { supabase, user } = await requireAuth();

  const { data, error } = await supabase
    .from("linkedin_style_samples")
    .insert({
      user_id: user.id,
      example_comment: exampleComment.trim(),
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath(`${REVALIDATE_PATH}/mon-style`);
  return data as StyleSample;
}

export async function deleteStyleSample(sampleId: string): Promise<void> {
  const { supabase } = await requireAuth();

  const { error } = await supabase
    .from("linkedin_style_samples")
    .delete()
    .eq("id", sampleId);

  if (error) throw new Error(error.message);
  revalidatePath(`${REVALIDATE_PATH}/mon-style`);
}

// ---------------------------------------------------------------------------
// REWRITE OPTIONS — Custom user presets
// ---------------------------------------------------------------------------

export async function getRewriteOptions(): Promise<RewriteOption[]> {
  const { supabase, user } = await requireAuth();

  const { data } = await supabase
    .from("linkedin_rewrite_options")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (data || []) as RewriteOption[];
}

export async function createRewriteOption(
  name: string,
  instruction: string,
): Promise<RewriteOption | null> {
  const { supabase, user } = await requireAuth();

  const { data, error } = await supabase
    .from("linkedin_rewrite_options")
    .insert({ user_id: user.id, name, instruction })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as RewriteOption;
}

export async function deleteRewriteOption(optionId: string): Promise<void> {
  const { supabase } = await requireAuth();

  const { error } = await supabase
    .from("linkedin_rewrite_options")
    .delete()
    .eq("id", optionId);

  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// STATS — Dashboard data
// ---------------------------------------------------------------------------

export async function getEngageStats(): Promise<EngageStats> {
  const { supabase, user } = await requireAuth();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISO = today.toISOString();

  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthStartISO = monthStart.toISOString();

  // Comments today
  const { count: commentsToday } = await supabase
    .from("linkedin_comment_history")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("posted_at", todayISO);

  // Comments this month
  const { count: commentsThisMonth } = await supabase
    .from("linkedin_comment_history")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("posted_at", monthStartISO);

  // Unique profiles engaged today
  const { data: todayComments } = await supabase
    .from("linkedin_comment_history")
    .select("creator_name")
    .eq("user_id", user.id)
    .gte("posted_at", todayISO);

  const uniqueProfiles = new Set(
    (todayComments || []).map((c) => c.creator_name).filter(Boolean),
  );

  // Total impressions
  const { data: impressionData } = await supabase
    .from("linkedin_comment_history")
    .select("impressions, replies_count")
    .eq("user_id", user.id)
    .gte("posted_at", monthStartISO);

  const totalImpressions = (impressionData || []).reduce(
    (sum, c) => sum + (c.impressions || 0),
    0,
  );
  const totalReplies = (impressionData || []).reduce(
    (sum, c) => sum + (c.replies_count || 0),
    0,
  );
  const avgRepliesRate =
    (commentsThisMonth || 0) > 0
      ? Math.round((totalReplies / (commentsThisMonth || 1)) * 100)
      : 0;

  // Best hour (from all history)
  const { data: allComments } = await supabase
    .from("linkedin_comment_history")
    .select("posted_at, impressions")
    .eq("user_id", user.id)
    .order("posted_at", { ascending: false })
    .limit(200);

  let bestHour: number | null = null;
  if (allComments && allComments.length > 0) {
    const hourMap: Record<number, { count: number; impressions: number }> = {};
    allComments.forEach((c) => {
      const hour = new Date(c.posted_at).getHours();
      if (!hourMap[hour]) hourMap[hour] = { count: 0, impressions: 0 };
      hourMap[hour].count++;
      hourMap[hour].impressions += c.impressions || 0;
    });
    let maxScore = 0;
    Object.entries(hourMap).forEach(([h, data]) => {
      const score = data.impressions + data.count * 10;
      if (score > maxScore) {
        maxScore = score;
        bestHour = parseInt(h);
      }
    });
  }

  return {
    commentsToday: commentsToday || 0,
    commentsThisMonth: commentsThisMonth || 0,
    profilesEngagedToday: uniqueProfiles.size,
    unreadReplies: 0, // TODO: implement when reply tracking is active
    totalImpressions,
    avgRepliesRate,
    bestHour,
    dailyGoal: 10,
  };
}

export async function getTopComments(
  limit = 10,
): Promise<CommentHistory[]> {
  const { supabase, user } = await requireAuth();

  const { data } = await supabase
    .from("linkedin_comment_history")
    .select("*")
    .eq("user_id", user.id)
    .order("impressions", { ascending: false })
    .limit(limit);

  return (data || []) as CommentHistory[];
}

export async function getTopCreators(): Promise<
  Array<{
    name: string;
    commentsCount: number;
    totalImpressions: number;
  }>
> {
  const { supabase, user } = await requireAuth();

  const { data } = await supabase
    .from("linkedin_comment_history")
    .select("creator_name, impressions")
    .eq("user_id", user.id)
    .not("creator_name", "is", null);

  if (!data) return [];

  const creatorMap: Record<
    string,
    { count: number; impressions: number }
  > = {};

  data.forEach((c) => {
    const name = c.creator_name || "Inconnu";
    if (!creatorMap[name]) creatorMap[name] = { count: 0, impressions: 0 };
    creatorMap[name].count++;
    creatorMap[name].impressions += c.impressions || 0;
  });

  return Object.entries(creatorMap)
    .map(([name, d]) => ({
      name,
      commentsCount: d.count,
      totalImpressions: d.impressions,
    }))
    .sort((a, b) => b.totalImpressions - a.totalImpressions)
    .slice(0, 10);
}

export async function getHourlyStats(): Promise<
  Array<{ hour: number; count: number; impressions: number }>
> {
  const { supabase, user } = await requireAuth();

  const { data } = await supabase
    .from("linkedin_comment_history")
    .select("posted_at, impressions")
    .eq("user_id", user.id);

  if (!data) return [];

  const hourMap: Record<number, { count: number; impressions: number }> = {};
  for (let h = 0; h < 24; h++) {
    hourMap[h] = { count: 0, impressions: 0 };
  }

  data.forEach((c) => {
    const hour = new Date(c.posted_at).getHours();
    hourMap[hour].count++;
    hourMap[hour].impressions += c.impressions || 0;
  });

  return Object.entries(hourMap).map(([h, d]) => ({
    hour: parseInt(h),
    count: d.count,
    impressions: d.impressions,
  }));
}

// ---------------------------------------------------------------------------
// SESSIONS — Focus mode tracking
// ---------------------------------------------------------------------------

export async function startSession(
  durationSeconds: number,
): Promise<LinkedInSession | null> {
  const { supabase, user } = await requireAuth();

  const { data, error } = await supabase
    .from("linkedin_sessions")
    .insert({
      user_id: user.id,
      duration_seconds: durationSeconds,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as LinkedInSession;
}

export async function endSession(
  sessionId: string,
  stats: {
    comments_posted: number;
    feeds_browsed: number;
    profiles_engaged: number;
  },
): Promise<void> {
  const { supabase } = await requireAuth();

  const { error } = await supabase
    .from("linkedin_sessions")
    .update({
      ...stats,
      ended_at: new Date().toISOString(),
    })
    .eq("id", sessionId);

  if (error) throw new Error(error.message);
  revalidatePath(REVALIDATE_PATH);
}

export async function getRecentSessions(
  limit = 10,
): Promise<LinkedInSession[]> {
  const { supabase, user } = await requireAuth();

  const { data } = await supabase
    .from("linkedin_sessions")
    .select("*")
    .eq("user_id", user.id)
    .order("started_at", { ascending: false })
    .limit(limit);

  return (data || []) as LinkedInSession[];
}

// ---------------------------------------------------------------------------
// RECOMMENDATIONS — AI-generated profile suggestions
// ---------------------------------------------------------------------------

export async function generateRecommendations(): Promise<Recommendation[]> {
  const { supabase, user } = await requireAuth();

  // Get recent comment history for context
  const { data: recentComments } = await supabase
    .from("linkedin_comment_history")
    .select("creator_name, post_url, comment_text, impressions")
    .eq("user_id", user.id)
    .order("posted_at", { ascending: false })
    .limit(20);

  // Get user profile for sector info
  const { data: userProfile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  const historyContext =
    recentComments && recentComments.length > 0
      ? `Historique des 20 derniers commentaires :\n${recentComments.map((c, i) => `${i + 1}. Chez "${c.creator_name}" — ${c.impressions || 0} impressions`).join("\n")}`
      : "Aucun historique de commentaires encore.";

  const prompt = `Tu es un expert en stratégie LinkedIn pour setters (prospecteurs commerciaux B2B dans le coaching/formation).

PROFIL DU SETTER : ${userProfile?.full_name || "Setter"} (rôle: ${userProfile?.role || "setter"})
Secteur : coaching, formation, consulting B2B

${historyContext}

Recommande 8 types de profils LinkedIn à commenter pour maximiser la visibilité et attirer des prospects. Pour chaque profil recommandé, donne :
- Un nom fictif réaliste (prénom + nom)
- Un titre de poste
- Une raison précise de la recommandation (1 phrase)
- Un score de pertinence (0-100)

Réponds en JSON : { "recommendations": [{ "name": "...", "title": "...", "reason": "...", "score": 80 }] }`;

  const result = await aiJSON<{
    recommendations: Array<{
      name: string;
      title: string;
      reason: string;
      score: number;
    }>;
  }>(prompt, {
    model: SMART_MODEL,
    maxTokens: 1000,
  });

  // Delete old recommendations
  await supabase
    .from("linkedin_recommendations")
    .delete()
    .eq("user_id", user.id);

  // Insert new ones
  const inserts = (result.recommendations || []).map((r) => ({
    user_id: user.id,
    profile_name: r.name,
    profile_title: r.title,
    reason: r.reason,
    score: r.score,
  }));

  const { data: saved } = await supabase
    .from("linkedin_recommendations")
    .insert(inserts)
    .select();

  revalidatePath(`${REVALIDATE_PATH}/recommandations`);
  return (saved || []) as Recommendation[];
}

export async function getRecommendations(): Promise<Recommendation[]> {
  const { supabase, user } = await requireAuth();

  const { data } = await supabase
    .from("linkedin_recommendations")
    .select("*")
    .eq("user_id", user.id)
    .order("score", { ascending: false });

  return (data || []) as Recommendation[];
}

// ---------------------------------------------------------------------------
// RECENT ACTIVITY — For dashboard
// ---------------------------------------------------------------------------

export async function getRecentActivity(
  limit = 5,
): Promise<CommentHistory[]> {
  const { supabase, user } = await requireAuth();

  const { data } = await supabase
    .from("linkedin_comment_history")
    .select("*")
    .eq("user_id", user.id)
    .order("posted_at", { ascending: false })
    .limit(limit);

  return (data || []) as CommentHistory[];
}

// ---------------------------------------------------------------------------
// COPY COMMENT TO STYLE — From stats page
// ---------------------------------------------------------------------------

export async function copyCommentToStyle(commentText: string): Promise<void> {
  await addStyleSample(commentText);
}
