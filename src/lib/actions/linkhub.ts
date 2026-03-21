"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { aiJSON } from "@/lib/ai/client";
import { callApifyActor } from "@/lib/apify";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ProspectPost {
  id: string;
  prospect_id: string | null;
  user_id: string;
  platform: "linkedin" | "instagram";
  post_url: string | null;
  post_text: string | null;
  post_image_url: string | null;
  author_name: string;
  author_avatar_url: string | null;
  author_headline: string | null;
  published_at: string | null;
  engagement_status: "pending" | "commented" | "liked" | "shared" | "skipped";
  selected_comment: string | null;
  commented_at: string | null;
  ai_suggestions: Array<{ type: string; comment: string }>;
  scraped_at: string;
  created_at: string;
  prospect?: {
    full_name: string | null;
    profile_url: string | null;
    status: string | null;
  };
}

export interface LinkHubStats {
  totalPosts: number;
  pendingPosts: number;
  commentedPosts: number;
  linkedinPosts: number;
  instagramPosts: number;
}

// ─── Récupérer le feed de posts ─────────────────────────────────────────────

export async function getProspectPostsFeed(filters?: {
  platform?: "linkedin" | "instagram";
  status?: string;
  search?: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { posts: [], stats: null };

  let query = supabase
    .from("prospect_posts")
    .select("*, prospect:prospects(full_name, profile_url, status)")
    .eq("user_id", user.id)
    .order("scraped_at", { ascending: false });

  if (filters?.platform) {
    query = query.eq("platform", filters.platform);
  }
  if (filters?.status) {
    query = query.eq("engagement_status", filters.status);
  }

  const { data: posts, error } = await query.limit(100);

  if (error) {
    console.error("[LinkHub] Erreur récupération posts:", error);
    return { posts: [], stats: null };
  }

  let filtered = (posts || []) as ProspectPost[];

  // Filtre recherche côté client (author_name, post_text)
  if (filters?.search) {
    const s = filters.search.toLowerCase();
    filtered = filtered.filter(
      (p) =>
        p.author_name.toLowerCase().includes(s) ||
        (p.post_text && p.post_text.toLowerCase().includes(s)),
    );
  }

  const allPosts = (posts || []) as ProspectPost[];
  const stats: LinkHubStats = {
    totalPosts: allPosts.length,
    pendingPosts: allPosts.filter((p) => p.engagement_status === "pending")
      .length,
    commentedPosts: allPosts.filter((p) => p.engagement_status === "commented")
      .length,
    linkedinPosts: allPosts.filter((p) => p.platform === "linkedin").length,
    instagramPosts: allPosts.filter((p) => p.platform === "instagram").length,
  };

  return { posts: filtered, stats };
}

// ─── Scraper les posts LinkedIn d'un prospect ───────────────────────────────

export async function scrapeLinkedInPosts(profileUrl: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  // Trouver le prospect lié
  const { data: prospect } = await supabase
    .from("prospects")
    .select("id, full_name")
    .eq("profile_url", profileUrl)
    .eq("user_id", user.id)
    .single();

  interface ApifyLinkedInPost {
    text?: string;
    postUrl?: string;
    url?: string;
    authorName?: string;
    authorProfileUrl?: string;
    authorHeadline?: string;
    authorProfilePicture?: string;
    imageUrl?: string;
    images?: string[];
    publishedAt?: string;
    timeSincePosted?: string;
  }

  const results = await callApifyActor<ApifyLinkedInPost>(
    "dev_fusion/Linkedin-Posts-Scraper",
    { profileUrls: [profileUrl], maxPosts: 10 },
    120,
  );

  if (!results || results.length === 0) {
    return { scraped: 0, message: "Aucun post trouvé pour ce profil." };
  }

  // Dédupliquer par post_url
  const { data: existing } = await supabase
    .from("prospect_posts")
    .select("post_url")
    .eq("user_id", user.id)
    .not("post_url", "is", null);

  const existingUrls = new Set(
    (existing || []).map((e: { post_url: string }) => e.post_url),
  );

  const newPosts = results
    .filter((r) => {
      const url = r.postUrl || r.url;
      return url && !existingUrls.has(url);
    })
    .map((r) => ({
      user_id: user.id,
      prospect_id: prospect?.id || null,
      platform: "linkedin" as const,
      post_url: r.postUrl || r.url || null,
      post_text: r.text || null,
      post_image_url: r.imageUrl || r.images?.[0] || null,
      author_name: r.authorName || prospect?.full_name || "Profil LinkedIn",
      author_avatar_url: r.authorProfilePicture || null,
      author_headline: r.authorHeadline || null,
      published_at: r.publishedAt || null,
      engagement_status: "pending" as const,
      ai_suggestions: [],
    }));

  if (newPosts.length === 0) {
    return { scraped: 0, message: "Tous les posts ont déjà été importés." };
  }

  const { error } = await supabase.from("prospect_posts").insert(newPosts);

  if (error) {
    console.error("[LinkHub] Erreur insertion posts LinkedIn:", error);
    throw new Error("Erreur lors de l'enregistrement des posts.");
  }

  revalidatePath("/prospecting/linkhub");
  return {
    scraped: newPosts.length,
    message: `${newPosts.length} post(s) LinkedIn importé(s).`,
  };
}

// ─── Scraper les posts Instagram d'un prospect ──────────────────────────────

export async function scrapeInstagramPosts(username: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  // Trouver le prospect lié
  const { data: prospect } = await supabase
    .from("prospects")
    .select("id, full_name")
    .or(`profile_url.ilike.%instagram.com/${username}%,profile_url.ilike.%${username}%`)
    .eq("user_id", user.id)
    .single();

  interface ApifyInstagramPost {
    caption?: string;
    url?: string;
    shortCode?: string;
    displayUrl?: string;
    ownerFullName?: string;
    ownerUsername?: string;
    ownerProfilePicUrl?: string;
    timestamp?: string;
    takenAtTimestamp?: number;
  }

  const results = await callApifyActor<ApifyInstagramPost>(
    "apify/instagram-post-scraper",
    { username: [username], resultsLimit: 10 },
    120,
  );

  if (!results || results.length === 0) {
    return { scraped: 0, message: "Aucun post trouvé pour ce compte." };
  }

  const { data: existing } = await supabase
    .from("prospect_posts")
    .select("post_url")
    .eq("user_id", user.id)
    .not("post_url", "is", null);

  const existingUrls = new Set(
    (existing || []).map((e: { post_url: string }) => e.post_url),
  );

  const newPosts = results
    .filter((r) => {
      const url = r.url || (r.shortCode ? `https://www.instagram.com/p/${r.shortCode}/` : null);
      return url && !existingUrls.has(url);
    })
    .map((r) => ({
      user_id: user.id,
      prospect_id: prospect?.id || null,
      platform: "instagram" as const,
      post_url: r.url || (r.shortCode ? `https://www.instagram.com/p/${r.shortCode}/` : null),
      post_text: r.caption || null,
      post_image_url: r.displayUrl || null,
      author_name: r.ownerFullName || r.ownerUsername || username,
      author_avatar_url: r.ownerProfilePicUrl || null,
      author_headline: null,
      published_at: r.timestamp || (r.takenAtTimestamp ? new Date(r.takenAtTimestamp * 1000).toISOString() : null),
      engagement_status: "pending" as const,
      ai_suggestions: [],
    }));

  if (newPosts.length === 0) {
    return { scraped: 0, message: "Tous les posts ont déjà été importés." };
  }

  const { error } = await supabase.from("prospect_posts").insert(newPosts);

  if (error) {
    console.error("[LinkHub] Erreur insertion posts Instagram:", error);
    throw new Error("Erreur lors de l'enregistrement des posts.");
  }

  revalidatePath("/prospecting/linkhub");
  return {
    scraped: newPosts.length,
    message: `${newPosts.length} post(s) Instagram importé(s).`,
  };
}

// ─── Générer des suggestions de commentaires IA ─────────────────────────────

export async function generateCommentSuggestions(postId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const { data: post } = await supabase
    .from("prospect_posts")
    .select("*")
    .eq("id", postId)
    .eq("user_id", user.id)
    .single();

  if (!post) throw new Error("Post non trouvé");

  const postContext = post.post_text
    ? post.post_text.slice(0, 500)
    : post.post_url || "Post sans texte";

  try {
    const result = await aiJSON<{
      comments: Array<{ type: string; comment: string }>;
    }>(
      `Génère 3 commentaires intelligents pour engager avec ce post ${post.platform}.

AUTEUR : ${post.author_name}${post.author_headline ? ` — ${post.author_headline}` : ""}
CONTENU DU POST : ${postContext}

Génère 3 commentaires de types différents :
1. "value" — Apporte de la valeur ajoutée, partage une expérience ou un insight pertinent
2. "question" — Pose une question pertinente pour engager la conversation et se faire remarquer
3. "story" — Raconte un lien personnel ou professionnel avec le sujet du post

Réponds en JSON :
{
  "comments": [
    { "type": "value", "comment": "..." },
    { "type": "question", "comment": "..." },
    { "type": "story", "comment": "..." }
  ]
}

Règles :
- Chaque commentaire fait 2-3 phrases
- Ton professionnel mais humain et authentique
- Pas de flatterie excessive ni de formules génériques
- Objectif : se faire remarquer positivement par l'auteur pour préparer un futur DM
- Adapte le ton au réseau (${post.platform === "linkedin" ? "professionnel, vouvoiement" : "décontracté, tutoiement"})
- En français`,
      {
        system:
          "Tu es un expert en social selling et engagement sur les réseaux sociaux. Tu crées des commentaires naturels et pertinents qui maximisent la visibilité auprès des prospects.",
      },
    );

    const suggestions = result.comments || [];

    // Sauvegarder les suggestions
    const { error } = await supabase
      .from("prospect_posts")
      .update({
        ai_suggestions: suggestions,
        updated_at: new Date().toISOString(),
      })
      .eq("id", postId)
      .eq("user_id", user.id);

    if (error) {
      console.error("[LinkHub] Erreur sauvegarde suggestions:", error);
    }

    revalidatePath("/prospecting/linkhub");
    return suggestions;
  } catch {
    // Fallback avec des commentaires génériques contextualisés
    const fallback = [
      {
        type: "value" as const,
        comment: `Très pertinent ! Ce sujet me parle particulièrement dans mon accompagnement au quotidien. Les résultats concrets que j'observe vont exactement dans ce sens. Merci pour ce partage ${post.author_name}.`,
      },
      {
        type: "question" as const,
        comment: `Très intéressant ${post.author_name} ! Quelle a été la plus grosse difficulté que vous avez rencontrée sur ce sujet ? Je serais curieux d'en savoir plus sur votre expérience terrain.`,
      },
      {
        type: "story" as const,
        comment: `Ça me parle tellement ! J'accompagne des professionnels sur ce sujet et je retrouve exactement ces tendances. Le marché évolue vite et c'est inspirant de voir cette approche. Bravo !`,
      },
    ];

    await supabase
      .from("prospect_posts")
      .update({
        ai_suggestions: fallback,
        updated_at: new Date().toISOString(),
      })
      .eq("id", postId)
      .eq("user_id", user.id);

    revalidatePath("/prospecting/linkhub");
    return fallback;
  }
}

// ─── Marquer un post comme engagé ───────────────────────────────────────────

export async function markPostEngaged(
  postId: string,
  status: "commented" | "liked" | "shared" | "skipped",
  selectedComment?: string,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const updateData: Record<string, unknown> = {
    engagement_status: status,
    updated_at: new Date().toISOString(),
  };

  if (status === "commented" && selectedComment) {
    updateData.selected_comment = selectedComment;
    updateData.commented_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("prospect_posts")
    .update(updateData)
    .eq("id", postId)
    .eq("user_id", user.id);

  if (error) {
    console.error("[LinkHub] Erreur mise à jour engagement:", error);
    throw new Error("Erreur lors de la mise à jour.");
  }

  revalidatePath("/prospecting/linkhub");
}

// ─── Scraper les posts de tous les prospects ────────────────────────────────

export async function scrapeAllProspectPosts() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const { data: prospects } = await supabase
    .from("prospects")
    .select("id, full_name, profile_url, platform")
    .eq("user_id", user.id)
    .in("status", ["new", "contacted", "replied"])
    .not("profile_url", "is", null)
    .limit(20);

  if (!prospects || prospects.length === 0) {
    return { total: 0, message: "Aucun prospect avec un profil à scraper." };
  }

  let totalScraped = 0;
  const errors: string[] = [];

  for (const p of prospects) {
    try {
      if (p.platform === "linkedin" && p.profile_url) {
        const result = await scrapeLinkedInPosts(p.profile_url);
        totalScraped += result.scraped;
      } else if (p.platform === "instagram" && p.profile_url) {
        const username = p.profile_url.replace(/\/$/, "").split("/").pop();
        if (username) {
          const result = await scrapeInstagramPosts(username);
          totalScraped += result.scraped;
        }
      }
    } catch (err) {
      errors.push(`${p.full_name}: ${err instanceof Error ? err.message : "erreur"}`);
    }
  }

  revalidatePath("/prospecting/linkhub");
  return {
    total: totalScraped,
    prospects: prospects.length,
    errors,
    message: `${totalScraped} post(s) importé(s) depuis ${prospects.length} prospect(s).${errors.length > 0 ? ` ${errors.length} erreur(s).` : ""}`,
  };
}

// ─── Supprimer un post ──────────────────────────────────────────────────────

export async function deleteProspectPost(postId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const { error } = await supabase
    .from("prospect_posts")
    .delete()
    .eq("id", postId)
    .eq("user_id", user.id);

  if (error) {
    console.error("[LinkHub] Erreur suppression post:", error);
    throw new Error("Erreur lors de la suppression.");
  }

  revalidatePath("/prospecting/linkhub");
}
