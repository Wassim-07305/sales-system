"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Lightweight helper: inserts a notification in DB + sends web push.
 * Designed to be called from any server action without creating a new Supabase client.
 * Fire-and-forget — never throws.
 */
export async function notify(
  userId: string,
  title: string,
  body: string,
  opts?: { link?: string; type?: string }
) {
  try {
    const supabase = await createClient();
    // 1. Insert notification in DB
    await supabase.from("notifications").insert({
      user_id: userId,
      title,
      body,
      type: opts?.type || "push",
      link: opts?.link || null,
    });
    // 2. Send web push (fire-and-forget)
    const { sendPush } = await import("@/lib/actions/push");
    sendPush(userId, title, body, opts?.link).catch(() => {});
  } catch {
    // Never block the calling action
  }
}

/**
 * Send push notifications to multiple users.
 * Fire-and-forget — never throws.
 */
export async function notifyMany(
  userIds: string[],
  title: string,
  body: string,
  opts?: { link?: string; type?: string }
) {
  try {
    const supabase = await createClient();
    const notifications = userIds.map((id) => ({
      user_id: id,
      title,
      body,
      type: opts?.type || "push",
      link: opts?.link || null,
    }));
    await supabase.from("notifications").insert(notifications);
    // Send push to each user (fire-and-forget)
    const { sendBulkPush } = await import("@/lib/actions/push");
    sendBulkPush(userIds, title, body, opts?.link).catch(() => {});
  } catch {
    // Never block
  }
}

export async function createNotification(data: {
  userId: string;
  title: string;
  body?: string;
  type?: string;
  link?: string;
}) {
  await notify(data.userId, data.title, data.body || "", {
    link: data.link,
    type: data.type,
  });
}

/**
 * Send a push notification to a user: creates a DB record and attempts web-push delivery.
 * Web-push sending is stubbed (console log) when VAPID keys are not configured.
 */
export async function sendPushNotification(
  userId: string,
  title: string,
  body: string,
  link?: string,
  type?: string
) {
  const supabase = await createClient();

  // 1. Create the notification record in the DB
  const { data: notification, error: insertError } = await supabase
    .from("notifications")
    .insert({
      user_id: userId,
      title,
      body,
      type: type || "push",
      link: link || null,
    })
    .select("id")
    .single();

  if (insertError) {
    console.error("[Notification] Erreur création:", insertError);
    return { success: false, reason: "db_error" as const };
  }

  // 2. Fetch push subscriptions for this user
  const { data: subscriptions } = await supabase
    .from("push_subscriptions")
    .select("*")
    .eq("user_id", userId);

  if (!subscriptions || subscriptions.length === 0) {
    console.log(
      `[Push] Aucun abonnement push pour l'utilisateur ${userId}. Notification enregistrée en DB uniquement.`
    );
    return {
      success: true,
      notificationId: notification?.id,
      pushSent: false,
      reason: "no_subscription" as const,
    };
  }

  // 3. Attempt web-push delivery (stubbed if VAPID keys are missing)
  const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
  const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";

  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.log(
      `[Push] VAPID non configuré — notification push simulée pour ${userId}:`,
      { title, body, link }
    );
    return {
      success: true,
      notificationId: notification?.id,
      pushSent: false,
      reason: "vapid_not_configured" as const,
    };
  }

  // If VAPID keys are present, delegate to the existing sendPush action
  // (imported dynamically to avoid circular deps at module level)
  try {
    const { sendPush } = await import("@/lib/actions/push");
    const result = await sendPush(userId, title, body);
    return {
      success: true,
      notificationId: notification?.id,
      pushSent: result.sent,
      reason: result.sent ? undefined : (result.reason as string),
    };
  } catch (err) {
    console.error("[Push] Erreur lors de l'envoi push:", err);
    return {
      success: true,
      notificationId: notification?.id,
      pushSent: false,
      reason: "send_error" as const,
    };
  }
}

/**
 * Send a test notification to the currently authenticated user.
 */
export async function sendTestNotification() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  return sendPushNotification(
    user.id,
    "Notification de test",
    "Ceci est une notification de test envoyée depuis les paramètres.",
    "/settings/notifications",
    "push"
  );
}

/**
 * Get notification preferences for the current user.
 * Falls back to defaults if no preferences are stored yet.
 */
export async function getNotificationPreferences() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const { data } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("user_id", user.id)
    .single();

  // Return stored prefs or defaults
  return (
    data || {
      push_enabled: true,
      email_enabled: true,
      notify_deals: true,
      notify_bookings: true,
      notify_challenges: true,
      notify_community: true,
      notify_team: true,
    }
  );
}

/**
 * Update notification preferences for the current user.
 * Uses upsert so it works whether or not a row already exists.
 */
export async function updateNotificationPreferences(prefs: {
  push_enabled?: boolean;
  email_enabled?: boolean;
  notify_deals?: boolean;
  notify_bookings?: boolean;
  notify_challenges?: boolean;
  notify_community?: boolean;
  notify_team?: boolean;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const { error } = await supabase
    .from("notification_preferences")
    .upsert(
      { user_id: user.id, ...prefs, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );

  if (error) {
    // If the table doesn't exist yet, log and continue gracefully
    console.warn(
      "[Notification Preferences] Erreur sauvegarde (la table notification_preferences n'existe peut-être pas encore):",
      error.message
    );
    return { success: false, error: error.message };
  }

  revalidatePath("/settings/notifications");
  return { success: true };
}

export async function markNotificationRead(notificationId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", notificationId)
    .eq("user_id", user.id);

  revalidatePath("/notifications");
}

export async function markAllNotificationsRead() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", user.id)
    .eq("read", false);

  revalidatePath("/notifications");
}
