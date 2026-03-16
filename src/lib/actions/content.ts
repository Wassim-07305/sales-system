"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getContentPosts() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("content_posts")
    .select("*")
    .order("scheduled_at", { ascending: true });
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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const { error } = await supabase.from("content_posts").insert({
    title: formData.title,
    content: formData.content,
    platform: formData.platform,
    framework: formData.framework,
    scheduled_at: formData.scheduled_at || null,
    status: formData.status || "draft",
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
  const supabase = await createClient();
  const { error } = await supabase
    .from("content_posts")
    .update(formData)
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/content");
}

export async function deleteContentPost(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("content_posts").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/content");
}

export async function markPostsAsPublished(ids: string[]) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("content_posts")
    .update({ status: "published", published_at: new Date().toISOString() })
    .in("id", ids);
  if (error) throw new Error(error.message);
  revalidatePath("/content");
}
