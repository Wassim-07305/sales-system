"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// ─── Récupérer les paramètres de l'organisation ─────────────────────

export async function getOrgSettings() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { org_name: "", contact_email: "", email_notifications: true, booking_reminders: true, cs_alerts: true };

  const { data } = await supabase
    .from("user_settings")
    .select("key, value")
    .eq("user_id", user.id)
    .in("key", ["org_name", "contact_email", "email_notifications", "booking_reminders", "cs_alerts"]);

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
      { onConflict: "user_id,key" }
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
