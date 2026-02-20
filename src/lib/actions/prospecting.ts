"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getProspects(filters?: { platform?: string; status?: string; listId?: string }) {
  const supabase = await createClient();
  let query = supabase.from("prospects").select("*, list:prospect_lists(id, name)").order("created_at", { ascending: false });

  if (filters?.platform) query = query.eq("platform", filters.platform);
  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.listId) query = query.eq("list_id", filters.listId);

  const { data } = await query;
  return (data || []).map((d: Record<string, unknown>) => ({
    ...d,
    list: Array.isArray(d.list) ? d.list[0] || null : d.list,
  }));
}

export async function addProspect(formData: { name: string; profile_url?: string; platform: string; list_id?: string }) {
  const supabase = await createClient();
  const { error } = await supabase.from("prospects").insert({
    name: formData.name,
    profile_url: formData.profile_url || null,
    platform: formData.platform,
    list_id: formData.list_id || null,
    status: "new",
  });
  if (error) throw new Error(error.message);
  revalidatePath("/prospecting");
}

export async function updateProspectStatus(prospectId: string, status: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("prospects").update({ status }).eq("id", prospectId);
  if (error) throw new Error(error.message);
  revalidatePath("/prospecting");
}

export async function getDailyQuota() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const today = new Date().toISOString().split("T")[0];
  const { data } = await supabase
    .from("daily_quotas")
    .select("*")
    .eq("user_id", user.id)
    .eq("date", today)
    .single();

  if (data) return data;

  // Create today's quota
  const { data: newQuota } = await supabase
    .from("daily_quotas")
    .insert({ user_id: user.id, date: today, dms_sent: 0, dms_target: 20, replies_received: 0, bookings_from_dms: 0 })
    .select()
    .single();
  return newQuota;
}

export async function incrementDmsSent() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const today = new Date().toISOString().split("T")[0];
  const { data: quota } = await supabase
    .from("daily_quotas")
    .select("id, dms_sent")
    .eq("user_id", user.id)
    .eq("date", today)
    .single();

  if (quota) {
    await supabase.from("daily_quotas").update({ dms_sent: quota.dms_sent + 1 }).eq("id", quota.id);
  } else {
    await supabase.from("daily_quotas").insert({
      user_id: user.id, date: today, dms_sent: 1, dms_target: 20, replies_received: 0, bookings_from_dms: 0,
    });
  }
  revalidatePath("/prospecting");
}

export async function incrementReplies() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const today = new Date().toISOString().split("T")[0];
  const { data: quota } = await supabase.from("daily_quotas").select("id, replies_received").eq("user_id", user.id).eq("date", today).single();
  if (quota) {
    await supabase.from("daily_quotas").update({ replies_received: quota.replies_received + 1 }).eq("id", quota.id);
  }
  revalidatePath("/prospecting");
}

export async function getProspectLists() {
  const supabase = await createClient();
  const { data } = await supabase.from("prospect_lists").select("*").order("created_at", { ascending: false });
  return data || [];
}

export async function getTemplates() {
  const supabase = await createClient();
  const { data } = await supabase.from("dm_templates").select("*").order("step").order("variant");
  return data || [];
}

export async function createTemplate(formData: { name: string; platform: string; step: string; niche?: string; content: string; variant: string }) {
  const supabase = await createClient();
  const { error } = await supabase.from("dm_templates").insert(formData);
  if (error) throw new Error(error.message);
  revalidatePath("/prospecting/templates");
}

export async function updateTemplate(id: string, formData: { name?: string; platform?: string; step?: string; niche?: string; content?: string; variant?: string }) {
  const supabase = await createClient();
  const { error } = await supabase.from("dm_templates").update(formData).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/prospecting/templates");
}

export async function deleteTemplate(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("dm_templates").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/prospecting/templates");
}

export async function deleteProspect(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("prospects").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/prospecting");
}
