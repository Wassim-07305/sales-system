"use server";

import { createClient } from "@/lib/supabase/server";

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
    console.log(
      `[Push] Aucun abonnement push pour l'utilisateur ${userId}`
    );
    return { sent: false, reason: "no_subscription" };
  }

  // Stub: In production, use web-push library to send notification
  console.log(`[Push] Envoi de notification push à ${userId}:`, {
    title,
    body,
    endpoint: subscription.endpoint,
  });

  return { sent: true };
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
