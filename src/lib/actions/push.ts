"use server";

import webPush from "web-push";
import { createClient } from "@/lib/supabase/server";

// Configure VAPID keys
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_EMAIL = process.env.VAPID_EMAIL || "mailto:admin@salessystem.com";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webPush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
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
  await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", user.id);

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
  body: string
) {
  const supabase = await createClient();

  // Get the user's push subscription
  const { data: subscription } = await supabase
    .from("push_subscriptions")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (!subscription) {
    return { sent: false, reason: "no_subscription" };
  }

  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn("[Push] VAPID keys non configurées");
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
      data: { url: "/notifications" },
    });

    await webPush.sendNotification(pushSubscription, payload);
    return { sent: true };
  } catch (err: unknown) {
    const statusCode = (err as { statusCode?: number }).statusCode;
    // Si le navigateur a revoque l'abonnement (410 Gone), on le supprime
    if (statusCode === 410 || statusCode === 404) {
      await supabase
        .from("push_subscriptions")
        .delete()
        .eq("user_id", userId);
      return { sent: false, reason: "subscription_expired" };
    }
    console.error(`[Push] Erreur envoi à ${userId}:`, err);
    return { sent: false, reason: "send_error" };
  }
}

export async function sendBulkPush(
  userIds: string[],
  title: string,
  body: string
) {
  const results = [];

  for (const userId of userIds) {
    const result = await sendPush(userId, title, body);
    results.push({ userId, ...result });
  }

  const sentCount = results.filter((r) => r.sent).length;
  console.log(
    `[Push] Envoi en masse : ${sentCount}/${userIds.length} notifications envoyées`
  );

  return { total: userIds.length, sent: sentCount, results };
}
