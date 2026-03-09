"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getVoiceProfile() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("voice_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  return data;
}

export async function createOrUpdateVoiceProfile(sampleUrl: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: existing } = await supabase
    .from("voice_profiles")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (existing) {
    await supabase.from("voice_profiles").update({ sample_url: sampleUrl, status: "pending" }).eq("id", existing.id);
  } else {
    await supabase.from("voice_profiles").insert({ user_id: user.id, sample_url: sampleUrl, status: "pending" });
  }

  revalidatePath("/settings/voice");
}

export async function getVoiceMessages() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("voice_messages")
    .select("*, prospect:prospects(id, name)")
    .order("created_at", { ascending: false });

  return (data || []).map((d: Record<string, unknown>) => ({
    ...d,
    prospect: Array.isArray(d.prospect) ? d.prospect[0] || null : d.prospect,
  }));
}

export async function createVoiceMessage(formData: {
  input_text: string;
  scheduled_send_at?: string;
  target_prospect_id?: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Get voice profile
  const { data: profile } = await supabase
    .from("voice_profiles")
    .select("id")
    .eq("user_id", user.id)
    .single();

  await supabase.from("voice_messages").insert({
    voice_profile_id: profile?.id || null,
    input_text: formData.input_text,
    scheduled_send_at: formData.scheduled_send_at || null,
    target_prospect_id: formData.target_prospect_id || null,
    status: "pending",
  });

  revalidatePath("/settings/voice");
}
