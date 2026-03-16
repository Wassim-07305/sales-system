import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const CRON_SECRET = process.env.CRON_SECRET;

/**
 * Video call reminders cron — triggered daily at 07:00.
 * Envoie des rappels pour TOUTES les video rooms planifiées dans les 24h.
 * Inclut le titre, l'heure formatée, le lien Meet si disponible,
 * et un deep link cliquable vers la salle vidéo.
 *
 * Contrainte Vercel Hobby : exécution 1x/jour uniquement.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    return NextResponse.json(
      { error: "Service role key not configured" },
      { status: 500 },
    );
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
  );

  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  // Récupérer toutes les video rooms planifiées dans les prochaines 24h
  const { data: upcomingRooms } = await supabase
    .from("video_rooms")
    .select("id, title, scheduled_at, host_id, meeting_link")
    .eq("status", "scheduled")
    .gte("scheduled_at", now.toISOString())
    .lte("scheduled_at", in24h.toISOString())
    .order("scheduled_at", { ascending: true });

  if (!upcomingRooms || upcomingRooms.length === 0) {
    return NextResponse.json({ message: "No upcoming calls", notified: 0 });
  }

  // Récupérer tous les membres de l'équipe une seule fois
  const { data: allUsers } = await supabase
    .from("profiles")
    .select("id")
    .in("role", ["admin", "manager", "setter", "closer"]);

  if (!allUsers || allUsers.length === 0) {
    return NextResponse.json({ message: "No team users found", notified: 0 });
  }

  const userIds = allUsers.map((u: { id: string }) => u.id);

  // Préparer VAPID pour les push (une seule fois)
  let webPush: typeof import("web-push") | null = null;
  let vapidReady = false;
  try {
    webPush = await import("web-push");
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const email = process.env.VAPID_EMAIL || "mailto:admin@salessystem.com";
    if (publicKey && privateKey && webPush) {
      webPush.setVapidDetails(email, publicKey, privateKey);
      vapidReady = true;
    }
  } catch {
    // VAPID non disponible — on continue sans push
  }

  // Charger les subscriptions push une seule fois
  let subscriptions: { user_id: string; endpoint: string; keys: unknown }[] =
    [];
  if (vapidReady) {
    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("user_id, endpoint, keys")
      .in("user_id", userIds);
    subscriptions = subs || [];
  }

  let totalNotified = 0;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";

  for (const room of upcomingRooms) {
    const scheduledAt = new Date(room.scheduled_at as string);
    const dateStr = scheduledAt.toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
    const timeStr = scheduledAt.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const roomTitle = (room.title as string) || "Appel vidéo";
    const deepLink = `/chat/video/${room.id}`;

    const meetingLinkInfo = room.meeting_link
      ? ` — Lien Meet disponible dans la salle.`
      : "";

    // Créer les notifications in-app avec deep link
    const notifications = userIds.map((uid: string) => ({
      user_id: uid,
      title: `Rappel : ${roomTitle}`,
      body: `Prévu le ${dateStr} à ${timeStr}.${meetingLinkInfo} Cliquez pour rejoindre la salle.`,
      type: "video_call_reminder",
      link: deepLink,
      read: false,
    }));

    const { error } = await supabase
      .from("notifications")
      .insert(notifications);

    if (!error) totalNotified += userIds.length;

    // Envoyer les web push avec deep link (best-effort)
    if (vapidReady && webPush && subscriptions.length > 0) {
      const roomSubscriptions = subscriptions.filter((s) =>
        userIds.includes(s.user_id),
      );

      for (const sub of roomSubscriptions) {
        try {
          await webPush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: sub.keys as { p256dh: string; auth: string },
            },
            JSON.stringify({
              title: `Rappel : ${roomTitle}`,
              body: `Aujourd'hui à ${timeStr}${meetingLinkInfo}`,
              icon: "/icons/icon-192x192.png",
              badge: "/icons/icon-72x72.png",
              tag: `video-reminder-${room.id}`,
              data: { url: `${appUrl}${deepLink}` },
            }),
          );
        } catch {
          // Ignorer les erreurs de push individuelles
        }
      }
    }
  }

  return NextResponse.json({
    message: "Video reminders sent",
    calls: upcomingRooms.length,
    notified: totalNotified,
  });
}
