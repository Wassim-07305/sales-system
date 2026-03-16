"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createFeedback(data: {
  memberId: string;
  type: "feedback" | "coaching" | "review";
  title: string;
  content: string;
  rating?: number;
  actionItems?: string[];
  dealId?: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifie");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || (profile.role !== "admin" && profile.role !== "manager")) {
    throw new Error("Acces refuse : role admin ou manager requis");
  }

  const { error } = await supabase.from("feedback_sessions").insert({
    manager_id: user.id,
    member_id: data.memberId,
    type: data.type,
    title: data.title,
    content: data.content,
    rating: data.rating || null,
    action_items: data.actionItems ? JSON.stringify(data.actionItems) : "[]",
    deal_id: data.dealId || null,
    status: "sent",
  });

  if (error) throw new Error(error.message);
  revalidatePath("/team/feedback");
}

export async function getFeedbackForMember(memberId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("feedback_sessions")
    .select(
      "*, manager:profiles!feedback_sessions_manager_id_fkey(id, full_name, avatar_url)",
    )
    .eq("member_id", memberId)
    .order("created_at", { ascending: false });

  return (data || []).map((d: Record<string, unknown>) => ({
    ...d,
    manager: Array.isArray(d.manager) ? d.manager[0] || null : d.manager,
  }));
}

export async function getMyFeedback() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifie");

  const { data } = await supabase
    .from("feedback_sessions")
    .select(
      "*, manager:profiles!feedback_sessions_manager_id_fkey(id, full_name, avatar_url)",
    )
    .eq("member_id", user.id)
    .order("created_at", { ascending: false });

  return (data || []).map((d: Record<string, unknown>) => ({
    ...d,
    manager: Array.isArray(d.manager) ? d.manager[0] || null : d.manager,
  }));
}

export async function getFeedbackStats() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { total: 0, averageRating: 0, membersCoached: 0 };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role === "admin" || profile?.role === "manager") {
    const { data: feedbacks } = await supabase
      .from("feedback_sessions")
      .select("id, rating, member_id")
      .eq("manager_id", user.id);

    const list = feedbacks || [];
    const ratings = list
      .filter((f) => f.rating != null)
      .map((f) => f.rating as number);
    const avg =
      ratings.length > 0
        ? ratings.reduce((a, b) => a + b, 0) / ratings.length
        : 0;
    const uniqueMembers = new Set(list.map((f) => f.member_id)).size;

    return {
      total: list.length,
      averageRating: Math.round(avg * 10) / 10,
      membersCoached: uniqueMembers,
    };
  }

  // For members (setter/closer)
  const { data: feedbacks } = await supabase
    .from("feedback_sessions")
    .select("id, rating")
    .eq("member_id", user.id);

  const list = feedbacks || [];
  const ratings = list
    .filter((f) => f.rating != null)
    .map((f) => f.rating as number);
  const avg =
    ratings.length > 0
      ? ratings.reduce((a, b) => a + b, 0) / ratings.length
      : 0;

  return {
    total: list.length,
    averageRating: Math.round(avg * 10) / 10,
    membersCoached: 0,
  };
}

export async function acknowledgeFeedback(feedbackId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifie");

  const { error } = await supabase
    .from("feedback_sessions")
    .update({ status: "acknowledged", updated_at: new Date().toISOString() })
    .eq("id", feedbackId)
    .eq("member_id", user.id);

  if (error) throw new Error(error.message);
  revalidatePath("/team/feedback");
}

export async function getTeamMembersForFeedback() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .in("role", ["setter", "closer"])
    .order("full_name");

  return data || [];
}
