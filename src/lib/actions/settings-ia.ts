"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getSettingsIA() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return {
      linkedin_url: "",
      instagram_username: "",
      sync_frequency: "30",
      business_description: "",
      offer: "",
    };

  const { data } = await supabase
    .from("user_settings")
    .select("key, value")
    .eq("user_id", user.id)
    .in("key", [
      "linkedin_url",
      "instagram_username",
      "sync_frequency",
      "business_description",
      "offer",
    ]);

  const settings: Record<string, string> = {};
  for (const row of data || []) settings[row.key] = row.value;

  return {
    linkedin_url: settings.linkedin_url || "",
    instagram_username: settings.instagram_username || "",
    sync_frequency: settings.sync_frequency || "30",
    business_description: settings.business_description || "",
    offer: settings.offer || "",
  };
}

export async function saveSettingsIA(params: {
  linkedin_url: string;
  instagram_username: string;
  sync_frequency: string;
  business_description: string;
  offer: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const entries = [
    { key: "linkedin_url", value: params.linkedin_url },
    { key: "instagram_username", value: params.instagram_username },
    { key: "sync_frequency", value: params.sync_frequency },
    { key: "business_description", value: params.business_description },
    { key: "offer", value: params.offer },
  ];

  for (const entry of entries) {
    await supabase.from("user_settings").upsert(
      { user_id: user.id, key: entry.key, value: entry.value },
      { onConflict: "user_id,key" }
    );
  }

  // Also update profile company/niche fields if provided
  if (params.business_description || params.offer) {
    await supabase
      .from("profiles")
      .update({
        niche: params.offer || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);
  }

  revalidatePath("/settings-ia");
  return { success: true };
}

export async function getLastSyncTime() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("user_settings")
    .select("value")
    .eq("user_id", user.id)
    .eq("key", "last_linkedin_sync")
    .single();

  return data?.value || null;
}

export async function triggerManualSync() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  // Record sync time
  await supabase.from("user_settings").upsert(
    {
      user_id: user.id,
      key: "last_linkedin_sync",
      value: new Date().toISOString(),
    },
    { onConflict: "user_id,key" }
  );

  revalidatePath("/settings-ia");
  return { success: true, syncedAt: new Date().toISOString() };
}
