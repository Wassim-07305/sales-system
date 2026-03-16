"use server";

import webPush from "web-push";
import { createClient } from "@/lib/supabase/server";
import { getApiKey } from "@/lib/api-keys";

/**
 * Resolve VAPID keys: env vars first, then Supabase org_settings fallback.
 * Caches the result in-memory for the lifetime of the server process.
 */
let vapidConfigured = false;

async function ensureVapid(): Promise<boolean> {
  if (vapidConfigured) return true;

  const publicKey = await getApiKey("NEXT_PUBLIC_VAPID_PUBLIC_KEY");
  const privateKey = await getApiKey("VAPID_PRIVATE_KEY");
  const email =
    (await getApiKey("VAPID_EMAIL")) || "mailto:admin@salessystem.com";

  if (!publicKey || !privateKey) {
    return false;
  }

  try {
    webPush.setVapidDetails(email, publicKey, privateKey);
    vapidConfigured = true;
    return true;
  } catch (err) {
    console.error("[Push] Erreur configuration VAPID:", err);
    return false;
  }
}

export async function subscribePush(subscription: {
  endpoint: string;
  keys: Record<string, unknown>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  // Remove existing subscription for this user (if any)
  await supabase.from("push_subscriptions").delete().eq("user_id", user.id);

  // Insert new subscription
  const { error } = await supabase.from("push_subscriptions").insert({
    user_id: user.id,
    endpoint: subscription.endpoint,
    keys: subscription.keys,
  });

  if (error) throw new Error(error.message);
  return { success: true };
}

export async function unsubscribePush() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
  return { success: true };
}

export async function sendPush(
  userId: string,
  title: string,
  body: string,
  url?: string,
) {
  const supabase = await createClient();
  // Verify caller is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { sent: false, reason: "unauthenticated" };

  // Get the user's push subscription
  const { data: subscription } = await supabase
    .from("push_subscriptions")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (!subscription) {
    return { sent: false, reason: "no_subscription" };
  }

  const ready = await ensureVapid();
  if (!ready) {
    console.warn("[Push] Clés VAPID non configurées");
    return { sent: false, reason: "vapid_not_configured" };
  }

  try {
    const pushSubscription = {
      endpoint: subscription.endpoint,
      keys: subscription.keys as { p256dh: string; auth: string },
    };

    const payload = JSON.stringify({
      title,
      body,
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-72x72.png",
      data: { url: url || "/notifications" },
    });

    await webPush.sendNotification(pushSubscription, payload);
    return { sent: true };
  } catch (err: unknown) {
    const statusCode = (err as { statusCode?: number }).statusCode;
    // If the browser revoked the subscription (410 Gone / 404), clean up
    if (statusCode === 410 || statusCode === 404) {
      await supabase.from("push_subscriptions").delete().eq("user_id", userId);
      return { sent: false, reason: "subscription_expired" };
    }
    console.error(`[Push] Erreur envoi à ${userId}:`, err);
    return { sent: false, reason: "send_error" };
  }
}

export async function sendBulkPush(
  userIds: string[],
  title: string,
  body: string,
  url?: string,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const results = [];

  for (const userId of userIds) {
    const result = await sendPush(userId, title, body, url);
    results.push({ userId, ...result });
  }

  const sentCount = results.filter((r) => r.sent).length;

  return { total: userIds.length, sent: sentCount, results };
}
