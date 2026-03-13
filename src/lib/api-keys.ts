"use server";

import { createClient } from "@/lib/supabase/server";

// Priority: env var → Supabase org_settings → null
export async function getApiKey(key: string): Promise<string | null> {
  // 1. Check env var first
  const envVal = process.env[key];
  if (envVal) return envVal;

  // 2. Check Supabase org_settings table
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("org_settings")
      .select("value")
      .eq("key", key)
      .single();
    if (data?.value) return data.value;
  } catch {
    // Table might not exist yet, silently fail
  }

  return null;
}

// Get multiple keys at once
export async function getApiKeys(keys: string[]): Promise<Record<string, string | null>> {
  const result: Record<string, string | null> = {};
  for (const key of keys) {
    result[key] = await getApiKey(key);
  }
  return result;
}

// Save an API key to org_settings (admin only)
export async function saveApiKey(key: string, value: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non authentifié" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    return { success: false, error: "Accès refusé" };
  }

  const { error } = await supabase
    .from("org_settings")
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });

  if (error) return { success: false, error: error.message };
  return { success: true };
}

// Delete an API key
export async function deleteApiKey(key: string): Promise<{ success: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") return { success: false };

  await supabase.from("org_settings").delete().eq("key", key);
  return { success: true };
}

// Check which integrations are configured
export async function getIntegrationStatus(): Promise<Record<string, boolean>> {
  const keys = [
    "STRIPE_SECRET_KEY",
    "RESEND_API_KEY",
    "ELEVENLABS_API_KEY",
    "NEXT_PUBLIC_VAPID_PUBLIC_KEY",
    "VAPID_PRIVATE_KEY",
    "WHATSAPP_ACCESS_TOKEN",
    "WHATSAPP_PHONE_NUMBER_ID",
    "INSTAGRAM_ACCESS_TOKEN",
    "LINKEDIN_ACCESS_TOKEN",
    "OPENROUTER_API_KEY",
    "GOOGLE_CLIENT_SECRET",
    "NEXT_PUBLIC_GOOGLE_CLIENT_ID",
  ];

  const status: Record<string, boolean> = {};
  for (const key of keys) {
    const val = await getApiKey(key);
    status[key] = !!val;
  }
  return status;
}
