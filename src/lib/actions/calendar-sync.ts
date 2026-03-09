"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface CalendarSyncStatus {
  connected: boolean;
  lastSyncAt: string | null;
  syncedEventsCount: number;
  googleEmail: string | null;
}

export interface CalendarSettings {
  autoSyncEnabled: boolean;
  syncDirection: "bidirectional" | "export_only" | "import_only";
  defaultCalendarId: string;
  defaultCalendarName: string;
}

const DEFAULT_SETTINGS: CalendarSettings = {
  autoSyncEnabled: false,
  syncDirection: "export_only",
  defaultCalendarId: "",
  defaultCalendarName: "",
};

export async function getCalendarSyncStatus(): Promise<CalendarSyncStatus> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      connected: false,
      lastSyncAt: null,
      syncedEventsCount: 0,
      googleEmail: null,
    };
  }

  // Check if Google client ID is configured
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (!googleClientId) {
    return {
      connected: false,
      lastSyncAt: null,
      syncedEventsCount: 0,
      googleEmail: null,
    };
  }

  // TODO: When Google OAuth is configured, check for stored tokens
  // For now, return disconnected state
  return {
    connected: false,
    lastSyncAt: null,
    syncedEventsCount: 0,
    googleEmail: null,
  };
}

export async function syncCalendarEvents(): Promise<{
  success: boolean;
  message: string;
  syncedCount?: number;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      message: "Utilisateur non authentifie",
    };
  }

  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (!googleClientId) {
    return {
      success: false,
      message:
        "Configuration Google Calendar requise. Ajoutez NEXT_PUBLIC_GOOGLE_CLIENT_ID dans vos variables d'environnement.",
    };
  }

  // TODO: Implement actual Google Calendar sync when OAuth credentials are available
  // Steps would be:
  // 1. Retrieve stored Google OAuth tokens for this user
  // 2. Fetch bookings from Supabase
  // 3. Create/update Google Calendar events
  // 4. If bidirectional, also import Google Calendar events as bookings
  // 5. Update last_sync_at timestamp

  return {
    success: false,
    message:
      "Configuration Google Calendar requise. Les identifiants OAuth ne sont pas encore configures.",
  };
}

export async function getCalendarSettings(): Promise<CalendarSettings> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return DEFAULT_SETTINGS;
  }

  // Try to read settings from user_settings or a JSON column
  // For now, we use a simple approach checking a hypothetical user_settings table
  const { data: settings } = await supabase
    .from("user_settings")
    .select("value")
    .eq("user_id", user.id)
    .eq("key", "calendar_sync")
    .single();

  if (settings?.value) {
    try {
      const parsed = settings.value as unknown as CalendarSettings;
      return {
        autoSyncEnabled: parsed.autoSyncEnabled ?? DEFAULT_SETTINGS.autoSyncEnabled,
        syncDirection: parsed.syncDirection ?? DEFAULT_SETTINGS.syncDirection,
        defaultCalendarId: parsed.defaultCalendarId ?? DEFAULT_SETTINGS.defaultCalendarId,
        defaultCalendarName: parsed.defaultCalendarName ?? DEFAULT_SETTINGS.defaultCalendarName,
      };
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  return DEFAULT_SETTINGS;
}

export async function saveCalendarSettings(
  settings: CalendarSettings
): Promise<{ success: boolean; message: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Utilisateur non authentifie" };
  }

  // Upsert into user_settings table
  const { error } = await supabase.from("user_settings").upsert(
    {
      user_id: user.id,
      key: "calendar_sync",
      value: settings as unknown as Record<string, unknown>,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,key" }
  );

  if (error) {
    // If user_settings table doesn't exist yet, return graceful message
    console.error("Error saving calendar settings:", error);
    return {
      success: false,
      message:
        "Impossible de sauvegarder les parametres. La table user_settings n'existe peut-etre pas encore.",
    };
  }

  revalidatePath("/bookings/calendar-sync");
  return { success: true, message: "Parametres sauvegardes avec succes" };
}
