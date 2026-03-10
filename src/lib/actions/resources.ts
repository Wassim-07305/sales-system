"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getResources() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Récupérer le profil pour filtrer par rôle
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = profile?.role || "client_b2c";

  const { data } = await supabase
    .from("resource_items")
    .select("*")
    .order("created_at", { ascending: false });

  // Filtrer par rôle si target_roles est défini
  const filtered = (data || []).filter((r) => {
    if (!r.target_roles || r.target_roles.length === 0) return true;
    return r.target_roles.includes(role);
  });

  return filtered;
}

export async function getResourceCategories() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("resource_items")
    .select("category")
    .not("category", "is", null);

  const categories = [...new Set((data || []).map((r) => r.category).filter(Boolean))];
  return categories as string[];
}

export async function createResource(formData: {
  title: string;
  description?: string;
  resource_type: string;
  url: string;
  category?: string;
  tags?: string[];
  target_roles?: string[];
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const { error } = await supabase.from("resource_items").insert({
    title: formData.title,
    description: formData.description || null,
    resource_type: formData.resource_type,
    url: formData.url,
    category: formData.category || null,
    tags: formData.tags || [],
    target_roles: formData.target_roles || [],
    created_by: user.id,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/resources");
}

export async function deleteResource(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("resource_items").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/resources");
}

export async function incrementDownload(id: string) {
  const supabase = await createClient();
  const { data: item } = await supabase
    .from("resource_items")
    .select("download_count")
    .eq("id", id)
    .single();

  await supabase
    .from("resource_items")
    .update({ download_count: (item?.download_count || 0) + 1 })
    .eq("id", id);
}
