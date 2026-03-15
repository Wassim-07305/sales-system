"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// ─── Helpers ─────────────────────────────────────────────────────────

function isTableMissing(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  const msg = (error.message || "").toLowerCase();
  return (
    msg.includes("relation") && msg.includes("does not exist") ||
    error.code === "42P01"
  );
}

// ─── Server actions ───────────────────────────────────────────────────

export async function getRoadmapItems() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  try {
    const { data: items, error } = await supabase
      .from("roadmap_items")
      .select("*")
      .order("votes", { ascending: false });

    if (error) {
      if (isTableMissing(error)) return [];
      throw new Error(error.message);
    }

    // Check which items the user has voted for
    const { data: votes } = await supabase
      .from("roadmap_votes")
      .select("item_id")
      .eq("user_id", user.id);

    const votedIds = new Set(
      (votes || []).map((v: { item_id: string }) => v.item_id)
    );

    return (items || []).map(
      (item: {
        id: string;
        title: string;
        description: string;
        category: string;
        status: string;
        votes: number;
        createdAt?: string;
        created_at?: string;
      }) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        category: item.category,
        status: item.status as "planned" | "in_progress" | "done",
        votes: item.votes ?? 0,
        createdAt: item.createdAt || item.created_at || "",
        votedByUser: votedIds.has(item.id),
      })
    );
  } catch (err) {
    if (err instanceof Error && err.message.includes("does not exist")) return [];
    throw err;
  }
}

export async function getCommunityS() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  try {
    const { data: suggestions, error } = await supabase
      .from("roadmap_items")
      .select("*")
      .eq("status", "suggestion")
      .order("votes", { ascending: false });

    if (error) {
      if (isTableMissing(error)) return [];
      throw new Error(error.message);
    }

    // Check which items the user has voted for
    const { data: votes } = await supabase
      .from("roadmap_votes")
      .select("item_id")
      .eq("user_id", user.id);

    const votedIds = new Set(
      (votes || []).map((v: { item_id: string }) => v.item_id)
    );

    return (suggestions || []).map(
      (s: {
        id: string;
        title: string;
        description: string;
        category: string;
        votes: number;
        author_name?: string;
        authorName?: string;
        createdAt?: string;
        created_at?: string;
      }) => ({
        id: s.id,
        title: s.title,
        description: s.description,
        category: s.category,
        votes: s.votes ?? 0,
        authorName: s.authorName || s.author_name || "",
        createdAt: s.createdAt || s.created_at || "",
        votedByUser: votedIds.has(s.id),
      })
    );
  } catch (err) {
    if (err instanceof Error && err.message.includes("does not exist")) return [];
    throw err;
  }
}

export async function getReleaseNotes() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  try {
    const { data, error } = await supabase
      .from("release_notes")
      .select("*")
      .order("date", { ascending: false });

    if (error) {
      if (isTableMissing(error)) return [];
      throw new Error(error.message);
    }

    return data || [];
  } catch (err) {
    if (err instanceof Error && err.message.includes("does not exist")) return [];
    throw err;
  }
}

export async function voteForFeature(featureId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  // Check if user already voted
  const { data: existing, error: checkError } = await supabase
    .from("roadmap_votes")
    .select("id")
    .eq("user_id", user.id)
    .eq("item_id", featureId)
    .maybeSingle();

  if (checkError) {
    if (isTableMissing(checkError)) return;
    throw new Error(checkError.message);
  }

  if (existing) {
    // Remove vote
    await supabase
      .from("roadmap_votes")
      .delete()
      .eq("id", existing.id);
  } else {
    // Add vote
    const { error: insertError } = await supabase
      .from("roadmap_votes")
      .insert({ user_id: user.id, item_id: featureId });

    if (insertError) {
      if (isTableMissing(insertError)) return;
      throw new Error(insertError.message);
    }
  }

  revalidatePath("/roadmap");
}

export async function suggestFeature(data: {
  title: string;
  description: string;
  category: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  if (!data.title.trim() || !data.description.trim()) {
    throw new Error("Le titre et la description sont requis");
  }

  const { error } = await supabase.from("roadmap_items").insert({
    user_id: user.id,
    title: data.title.trim(),
    description: data.description.trim(),
    category: data.category,
    status: "suggestion",
    votes: 1,
  });

  if (error) {
    if (isTableMissing(error)) {
      throw new Error("La fonctionnalité de suggestions n'est pas encore configurée.");
    }
    throw new Error(error.message);
  }

  revalidatePath("/roadmap");
}
