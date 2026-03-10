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

  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (!googleClientId) {
    return {
      connected: false,
      lastSyncAt: null,
      syncedEventsCount: 0,
      googleEmail: null,
    };
  }

  // Vérifier si des tokens Google sont stockés pour l'utilisateur
  const { data: tokenData } = await supabase
    .from("user_settings")
    .select("value")
    .eq("user_id", user.id)
    .eq("key", "google_calendar_tokens")
    .single();

  if (!tokenData?.value) {
    return {
      connected: false,
      lastSyncAt: null,
      syncedEventsCount: 0,
      googleEmail: null,
    };
  }

  const tokens = tokenData.value as Record<string, unknown>;
  const expiresAt = tokens.expires_at as number;
  const isExpired = expiresAt ? Date.now() > expiresAt : true;

  // Récupérer les stats de sync
  const { data: syncData } = await supabase
    .from("user_settings")
    .select("value")
    .eq("user_id", user.id)
    .eq("key", "calendar_sync_stats")
    .single();

  const syncStats = (syncData?.value as Record<string, unknown>) || {};

  return {
    connected: !isExpired,
    lastSyncAt: (syncStats.last_sync_at as string) || null,
    syncedEventsCount: (syncStats.synced_count as number) || 0,
    googleEmail: (tokens.email as string) || null,
  };
}

export async function connectGoogleCalendar(authCode: string): Promise<{
  success: boolean;
  message: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Utilisateur non authentifié" };
  }

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return {
      success: false,
      message: "Configuration Google Calendar manquante (GOOGLE_CLIENT_SECRET)",
    };
  }

  try {
    // Échanger le code d'autorisation contre des tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code: authCode,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL || ""}/api/auth/google/callback`,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.json();
      return {
        success: false,
        message: `Erreur Google: ${error.error_description || error.error}`,
      };
    }

    const tokens = await tokenResponse.json();

    // Récupérer l'email Google
    const userInfoResponse = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      { headers: { Authorization: `Bearer ${tokens.access_token}` } }
    );
    const userInfo = userInfoResponse.ok ? await userInfoResponse.json() : {};

    // Stocker les tokens
    await supabase.from("user_settings").upsert(
      {
        user_id: user.id,
        key: "google_calendar_tokens",
        value: {
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: Date.now() + tokens.expires_in * 1000,
          email: userInfo.email || null,
        } as unknown as Record<string, unknown>,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,key" }
    );

    revalidatePath("/bookings/calendar-sync");
    return { success: true, message: "Google Calendar connecté avec succès" };
  } catch (err) {
    console.error("Google Calendar connect error:", err);
    return { success: false, message: "Erreur lors de la connexion" };
  }
}

export async function disconnectGoogleCalendar(): Promise<{
  success: boolean;
  message: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Utilisateur non authentifié" };
  }

  await supabase
    .from("user_settings")
    .delete()
    .eq("user_id", user.id)
    .eq("key", "google_calendar_tokens");

  revalidatePath("/bookings/calendar-sync");
  return { success: true, message: "Google Calendar déconnecté" };
}

async function getGoogleAccessToken(supabase: Awaited<ReturnType<typeof createClient>>, userId: string): Promise<string | null> {
  const { data: tokenData } = await supabase
    .from("user_settings")
    .select("value")
    .eq("user_id", userId)
    .eq("key", "google_calendar_tokens")
    .single();

  if (!tokenData?.value) return null;

  const tokens = tokenData.value as Record<string, unknown>;
  let accessToken = tokens.access_token as string;
  const expiresAt = tokens.expires_at as number;
  const refreshToken = tokens.refresh_token as string;

  // Rafraîchir le token si expiré
  if (Date.now() > expiresAt && refreshToken) {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) return null;

    try {
      const refreshResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          refresh_token: refreshToken,
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: "refresh_token",
        }),
      });

      if (refreshResponse.ok) {
        const newTokens = await refreshResponse.json();
        accessToken = newTokens.access_token;

        // Mettre à jour les tokens stockés
        await supabase.from("user_settings").upsert(
          {
            user_id: userId,
            key: "google_calendar_tokens",
            value: {
              ...tokens,
              access_token: accessToken,
              expires_at: Date.now() + newTokens.expires_in * 1000,
            } as unknown as Record<string, unknown>,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,key" }
        );
      } else {
        return null;
      }
    } catch {
      return null;
    }
  }

  return accessToken;
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
    return { success: false, message: "Utilisateur non authentifié" };
  }

  const accessToken = await getGoogleAccessToken(supabase, user.id);
  if (!accessToken) {
    return {
      success: false,
      message: "Google Calendar non connecté. Connectez votre compte Google d'abord.",
    };
  }

  // Récupérer les paramètres de sync
  const settings = await getCalendarSettings();

  try {
    let syncedCount = 0;

    // Export : envoyer les bookings vers Google Calendar
    if (settings.syncDirection === "export_only" || settings.syncDirection === "bidirectional") {
      // Récupérer les bookings non synchronisés
      const { data: bookings } = await supabase
        .from("bookings")
        .select("*, contact:contacts(id, first_name, last_name, email)")
        .eq("user_id", user.id)
        .is("google_event_id", null)
        .gte("date", new Date().toISOString().split("T")[0]);

      for (const booking of bookings || []) {
        const contact = Array.isArray(booking.contact) ? booking.contact[0] : booking.contact;
        const contactName = contact
          ? `${contact.first_name || ""} ${contact.last_name || ""}`.trim()
          : "Contact";

        const startDateTime = booking.date && booking.time
          ? `${booking.date}T${booking.time}:00`
          : booking.date;

        const endDate = new Date(startDateTime);
        endDate.setMinutes(endDate.getMinutes() + (booking.duration || 30));

        const eventBody = {
          summary: `${booking.type || "RDV"} — ${contactName}`,
          description: booking.notes || `Rendez-vous via Sales System`,
          start: {
            dateTime: startDateTime,
            timeZone: "Europe/Paris",
          },
          end: {
            dateTime: endDate.toISOString().replace("Z", ""),
            timeZone: "Europe/Paris",
          },
        };

        const calendarId = settings.defaultCalendarId || "primary";
        const createResponse = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(eventBody),
          }
        );

        if (createResponse.ok) {
          const event = await createResponse.json();
          // Marquer le booking comme synchronisé
          await supabase
            .from("bookings")
            .update({ google_event_id: event.id })
            .eq("id", booking.id);
          syncedCount++;
        }
      }
    }

    // Import : récupérer les événements Google Calendar
    if (settings.syncDirection === "import_only" || settings.syncDirection === "bidirectional") {
      const calendarId = settings.defaultCalendarId || "primary";
      const now = new Date().toISOString();
      const oneMonthLater = new Date();
      oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);

      const eventsResponse = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?` +
          new URLSearchParams({
            timeMin: now,
            timeMax: oneMonthLater.toISOString(),
            singleEvents: "true",
            orderBy: "startTime",
            maxResults: "50",
          }),
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (eventsResponse.ok) {
        const eventsData = await eventsResponse.json();
        const events = eventsData.items || [];

        for (const event of events) {
          // Vérifier si l'événement est déjà importé
          const { data: existing } = await supabase
            .from("bookings")
            .select("id")
            .eq("google_event_id", event.id)
            .single();

          if (!existing && event.start?.dateTime) {
            const startDate = new Date(event.start.dateTime);
            const endDate = event.end?.dateTime ? new Date(event.end.dateTime) : null;
            const durationMinutes = endDate
              ? Math.round((endDate.getTime() - startDate.getTime()) / 60000)
              : 30;

            await supabase.from("bookings").insert({
              user_id: user.id,
              date: startDate.toISOString().split("T")[0],
              time: startDate.toTimeString().substring(0, 5),
              duration: durationMinutes,
              type: "google_import",
              notes: event.summary || "Événement Google Calendar",
              status: "confirmed",
              google_event_id: event.id,
            });
            syncedCount++;
          }
        }
      }
    }

    // Mettre à jour les stats de sync
    await supabase.from("user_settings").upsert(
      {
        user_id: user.id,
        key: "calendar_sync_stats",
        value: {
          last_sync_at: new Date().toISOString(),
          synced_count: syncedCount,
        } as unknown as Record<string, unknown>,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,key" }
    );

    revalidatePath("/bookings/calendar-sync");
    return {
      success: true,
      message: `Synchronisation réussie : ${syncedCount} événement${syncedCount > 1 ? "s" : ""} synchronisé${syncedCount > 1 ? "s" : ""}`,
      syncedCount,
    };
  } catch (err) {
    console.error("Calendar sync error:", err);
    return {
      success: false,
      message: "Erreur lors de la synchronisation. Vérifiez votre connexion Google.",
    };
  }
}

export async function getCalendarSettings(): Promise<CalendarSettings> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return DEFAULT_SETTINGS;
  }

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
    return { success: false, message: "Utilisateur non authentifié" };
  }

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
    console.error("Error saving calendar settings:", error);
    return {
      success: false,
      message: "Impossible de sauvegarder les paramètres.",
    };
  }

  revalidatePath("/bookings/calendar-sync");
  return { success: true, message: "Paramètres sauvegardés avec succès" };
}
