"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// ─── Récupérer les paramètres de l'organisation ─────────────────────

export async function getOrgSettings() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return {
      org_name: "",
      contact_email: "",
      email_notifications: true,
      booking_reminders: true,
      cs_alerts: true,
    };

  const { data } = await supabase
    .from("user_settings")
    .select("key, value")
    .eq("user_id", user.id)
    .in("key", [
      "org_name",
      "contact_email",
      "email_notifications",
      "booking_reminders",
      "cs_alerts",
    ]);

  const settings: Record<string, string> = {};
  if (data) {
    for (const row of data) {
      settings[row.key] = row.value;
    }
  }

  return {
    org_name: settings.org_name || "",
    contact_email: settings.contact_email || user.email || "",
    email_notifications: settings.email_notifications !== "false",
    booking_reminders: settings.booking_reminders !== "false",
    cs_alerts: settings.cs_alerts !== "false",
  };
}

// ─── Sauvegarder les paramètres ─────────────────────────────────────

export async function saveOrgSettings(formData: {
  org_name: string;
  contact_email: string;
  email_notifications: boolean;
  booking_reminders: boolean;
  cs_alerts: boolean;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const entries = [
    { key: "org_name", value: formData.org_name },
    { key: "contact_email", value: formData.contact_email },
    { key: "email_notifications", value: String(formData.email_notifications) },
    { key: "booking_reminders", value: String(formData.booking_reminders) },
    { key: "cs_alerts", value: String(formData.cs_alerts) },
  ];

  for (const entry of entries) {
    const { error } = await supabase.from("user_settings").upsert(
      {
        user_id: user.id,
        key: entry.key,
        value: entry.value,
      },
      { onConflict: "user_id,key" },
    );
    if (error) {
      console.error("Erreur sauvegarde paramètre:", entry.key, error);
    }
  }

  revalidatePath("/settings");
  return { success: true };
}

// ─── Changer le mot de passe ────────────────────────────────────────

export async function changePassword(newPassword: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  if (newPassword.length < 8) {
    return { error: "Le mot de passe doit contenir au moins 8 caractères" };
  }

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

// ─── Profil utilisateur ─────────────────────────────────────────────

export async function getProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return data;
}

export async function updateProfile(params: {
  full_name: string;
  phone: string;
  company: string;
  niche: string;
  goals: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: params.full_name,
      phone: params.phone,
      company: params.company,
      niche: params.niche,
      goals: params.goals,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/profile");
  return { success: true };
}

// ─── Branding personnel ──────────────────────────────────────────────

export async function saveBrandingSettings(params: {
  full_name: string;
  bio: string;
  avatar_url: string;
  color_palette: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  // Mettre à jour le profil
  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      full_name: params.full_name || null,
      bio: params.bio || null,
      avatar_url: params.avatar_url || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (profileError) return { error: profileError.message };

  // Sauvegarder la palette dans user_settings
  const { error: settingsError } = await supabase.from("user_settings").upsert(
    {
      user_id: user.id,
      key: "color_palette",
      value: params.color_palette,
    },
    { onConflict: "user_id,key" },
  );

  if (settingsError) {
    console.error("Erreur sauvegarde palette:", settingsError);
  }

  revalidatePath("/settings/branding");
  revalidatePath("/profile");
  return { success: true };
}

export async function updateAvatarUrl(avatarUrl: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/profile");
  return { success: true };
}

// ─── Sauvegarder les préférences de notification ────────────────────

export async function saveNotificationPreferences(params: {
  push_enabled: boolean;
  email_notifications: boolean;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const entries = [
    { key: "push_enabled", value: String(params.push_enabled) },
    { key: "email_notifications", value: String(params.email_notifications) },
  ];

  for (const entry of entries) {
    const { error } = await supabase.from("user_settings").upsert(
      {
        user_id: user.id,
        key: entry.key,
        value: entry.value,
      },
      { onConflict: "user_id,key" },
    );
    if (error) {
      console.error("Erreur sauvegarde notification:", entry.key, error);
      return { error: error.message };
    }
  }

  revalidatePath("/settings");
  return { success: true };
}

export async function getBrandingSettings() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { color_palette: "default" };

  const { data } = await supabase
    .from("user_settings")
    .select("value")
    .eq("user_id", user.id)
    .eq("key", "color_palette")
    .single();

  return {
    color_palette: data?.value || "default",
  };
}
