"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const VALID_PLATFORMS = ["linkedin", "instagram", "youtube", "tiktok", "twitter", "facebook"] as const;
const VALID_STATUSES = ["draft", "scheduled", "published"] as const;
const MAX_TITLE_LENGTH = 200;

async function requireContentRole() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile || !["admin", "manager"].includes(profile.role))
    throw new Error("Accès refusé");

  return { supabase, user, role: profile.role };
}

export async function getContentPosts() {
  const { supabase } = await requireContentRole();

  const { data } = await supabase
    .from("content_posts")
    .select("*")
    .order("scheduled_at", { ascending: true })
    .limit(200);
  return data || [];
}

export async function createContentPost(formData: {
  title: string;
  content: string;
  platform: string;
  framework: string;
  scheduled_at?: string;
  status?: string;
}) {
  const { supabase, user } = await requireContentRole();

  // Input validation
  if (!formData.title || formData.title.trim().length === 0)
    throw new Error("Le titre est requis");
  if (formData.title.length > MAX_TITLE_LENGTH)
    throw new Error(`Le titre ne doit pas dépasser ${MAX_TITLE_LENGTH} caractères`);
  if (!VALID_PLATFORMS.includes(formData.platform as (typeof VALID_PLATFORMS)[number]))
    throw new Error("Plateforme invalide");
  const status = formData.status || "draft";
  if (!VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number]))
    throw new Error("Statut invalide");

  const { error } = await supabase.from("content_posts").insert({
    title: formData.title,
    content: formData.content,
    platform: formData.platform,
    framework: formData.framework,
    scheduled_at: formData.scheduled_at || null,
    status,
    created_by: user.id,
    metrics: {},
  });
  if (error) throw new Error(error.message);
  revalidatePath("/content");
}

export async function updateContentPost(
  id: string,
  formData: {
    title?: string;
    content?: string;
    platform?: string;
    framework?: string;
    scheduled_at?: string;
    status?: string;
    metrics?: Record<string, unknown>;
  },
) {
  const { supabase, user, role } = await requireContentRole();

  // Input validation
  if (formData.title !== undefined) {
    if (formData.title.trim().length === 0)
      throw new Error("Le titre est requis");
    if (formData.title.length > MAX_TITLE_LENGTH)
      throw new Error(`Le titre ne doit pas dépasser ${MAX_TITLE_LENGTH} caractères`);
  }
  if (formData.platform !== undefined && !VALID_PLATFORMS.includes(formData.platform as (typeof VALID_PLATFORMS)[number]))
    throw new Error("Plateforme invalide");
  if (formData.status !== undefined && !VALID_STATUSES.includes(formData.status as (typeof VALID_STATUSES)[number]))
    throw new Error("Statut invalide");

  let query = supabase
    .from("content_posts")
    .update(formData)
    .eq("id", id);

  // Ownership check: non-admin can only update their own posts
  if (role !== "admin") {
    query = query.eq("created_by", user.id);
  }

  const { error } = await query;
  if (error) throw new Error(error.message);
  revalidatePath("/content");
}

export async function deleteContentPost(id: string) {
  const { supabase, user, role } = await requireContentRole();

  let query = supabase.from("content_posts").delete().eq("id", id);

  // Ownership check: non-admin can only delete their own posts
  if (role !== "admin") {
    query = query.eq("created_by", user.id);
  }

  const { error } = await query;
  if (error) throw new Error(error.message);
  revalidatePath("/content");
}

export async function markPostsAsPublished(ids: string[]) {
  const { supabase } = await requireContentRole();

  const { error } = await supabase
    .from("content_posts")
    .update({ status: "published", published_at: new Date().toISOString() })
    .in("id", ids);
  if (error) throw new Error(error.message);
  revalidatePath("/content");
}
