import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const CRON_SECRET = process.env.CRON_SECRET;

/**
 * Daily email cron job — triggered by Vercel Cron or external scheduler.
 * 1. Sends notification digest emails to users with unread notifications
 * 2. Sends booking reminders for appointments in the next 24h
 */
export async function GET(request: Request) {
  // Verify cron secret to prevent unauthorized access
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

  const results = {
    digests: 0,
    reminders: 0,
    callReminders: 0,
    sequenceMessages: 0,
    errors: 0,
  };

  // --- 0. Video Call Reminders (today's scheduled calls) ---
  try {
    const { notifyUpcomingCalls } = await import("@/lib/actions/communication");
    const callResult = await notifyUpcomingCalls();
    results.callReminders = callResult.sent;
  } catch {
    results.errors++;
  }

  // --- 1. Notification Digests ---
  try {
    // Find users with unread notifications who have email enabled
    const { data: usersWithUnread } = await supabase
      .from("notifications")
      .select("user_id")
      .eq("read", false)
      .limit(500);

    const uniqueUserIds = [
      ...new Set((usersWithUnread || []).map((n) => n.user_id)),
    ];

    for (const userId of uniqueUserIds) {
      try {
        // Check if user has email enabled in preferences
        const { data: prefs } = await supabase
          .from("notification_preferences")
          .select("email_enabled")
          .eq("user_id", userId)
          .single();

        // Default to enabled if no preferences set
        if (prefs && prefs.email_enabled === false) continue;

        // Get user profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("email, full_name")
          .eq("id", userId)
          .single();

        if (!profile?.email) continue;

        // Get unread notifications
        const { data: notifications } = await supabase
          .from("notifications")
          .select("title, body, created_at")
          .eq("user_id", userId)
          .eq("read", false)
          .order("created_at", { ascending: false })
          .limit(10);

        if (!notifications || notifications.length === 0) continue;

        // Import and send (dynamic to avoid importing Resend at module level)
        const { sendNotificationDigest } = await import("@/lib/actions/email");
        await sendNotificationDigest(userId);
        results.digests++;
      } catch {
        results.errors++;
      }
    }
  } catch {
    results.errors++;
  }

  // --- 2. Booking Reminders (next 24h) — email + notification in-app ---
  try {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const { data: upcomingBookings } = await supabase
      .from("bookings")
      .select(
        "id, prospect_name, prospect_email, scheduled_at, slot_type, user_id",
      )
      .gte("scheduled_at", now.toISOString())
      .lte("scheduled_at", tomorrow.toISOString())
      .eq("status", "confirmed");

    for (const booking of upcomingBookings || []) {
      try {
        if (!booking.user_id) continue;

        const { data: assignee } = await supabase
          .from("profiles")
          .select("email, full_name")
          .eq("id", booking.user_id)
          .single();

        const prospectName = booking.prospect_name || "Client";
        const scheduledDate = new Date(booking.scheduled_at);
        const dateFormatted = scheduledDate.toLocaleString("fr-FR", {
          dateStyle: "long",
          timeStyle: "short",
        });
        const timeFormatted = scheduledDate.toLocaleTimeString("fr-FR", {
          hour: "2-digit",
          minute: "2-digit",
        });
        const slotType = booking.slot_type || "Rendez-vous";

        // 2a. Envoyer l'email rappel J-1
        if (assignee?.email) {
          try {
            const { sendBookingReminder } = await import("@/lib/actions/email");
            await sendBookingReminder({
              email: assignee.email,
              name: assignee.full_name || "",
              date: dateFormatted,
              type: slotType,
              prospectName,
            });
            results.reminders++;
          } catch {
            results.errors++;
          }
        }

        // 2b. Créer la notification in-app avec deep link + push
        try {
          const bookingLink = `/bookings`;
          await supabase.from("notifications").insert({
            user_id: booking.user_id,
            title: `Rappel : ${slotType} demain avec ${prospectName}`,
            body: `${prospectName} — demain à ${timeFormatted}. Préparez vos notes !`,
            type: "booking_reminder",
            link: bookingLink,
            read: false,
          });

          // Envoyer le push notification (best-effort)
          const { data: pushSub } = await supabase
            .from("push_subscriptions")
            .select("endpoint, keys")
            .eq("user_id", booking.user_id)
            .single();

          if (pushSub) {
            try {
              const webPush = await import("web-push");
              const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
              const privateKey = process.env.VAPID_PRIVATE_KEY;
              const vapidEmail =
                process.env.VAPID_EMAIL || "mailto:admin@salessystem.com";
              const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";

              if (publicKey && privateKey) {
                webPush.setVapidDetails(vapidEmail, publicKey, privateKey);
                await webPush.sendNotification(
                  {
                    endpoint: pushSub.endpoint,
                    keys: pushSub.keys as { p256dh: string; auth: string },
                  },
                  JSON.stringify({
                    title: `Rappel : ${slotType} demain`,
                    body: `${prospectName} — demain à ${timeFormatted}`,
                    icon: "/icons/icon-192x192.png",
                    badge: "/icons/icon-72x72.png",
                    tag: `booking-reminder-${booking.id}`,
                    data: { url: `${appUrl}/bookings` },
                  }),
                );
              }
            } catch {
              // Push best-effort
            }
          }
        } catch {
          // Notification in-app best-effort
        }
      } catch {
        results.errors++;
      }
    }
  } catch {
    results.errors++;
  }

  // --- 3. WhatsApp Sequence Follow-up Tasks ---
  try {
    const now = new Date();
    const { data: pendingTasks } = await supabase
      .from("follow_up_tasks")
      .select("id, sequence_id, prospect_id, step_index, message_content")
      .eq("completed", false)
      .lte("scheduled_at", now.toISOString())
      .limit(100);

    for (const task of pendingTasks || []) {
      try {
        if (!task.message_content || !task.prospect_id) {
          await supabase
            .from("follow_up_tasks")
            .update({ completed: true, completed_at: now.toISOString() })
            .eq("id", task.id);
          continue;
        }

        // Find the WhatsApp connection for the sequence owner
        const { data: sequence } = await supabase
          .from("whatsapp_sequences")
          .select("created_by")
          .eq("id", task.sequence_id)
          .single();

        if (sequence?.created_by) {
          const { data: connection } = await supabase
            .from("whatsapp_connections")
            .select("id")
            .eq("user_id", sequence.created_by)
            .single();

          if (connection) {
            await supabase.from("whatsapp_messages").insert({
              connection_id: connection.id,
              prospect_id: task.prospect_id,
              direction: "outbound",
              content: task.message_content,
              status: "queued",
              sequence_id: task.sequence_id,
            });
          }
        }

        await supabase
          .from("follow_up_tasks")
          .update({ completed: true, completed_at: now.toISOString() })
          .eq("id", task.id);
        results.sequenceMessages++;
      } catch {
        results.errors++;
      }
    }
  } catch {
    results.errors++;
  }

  return NextResponse.json({
    ok: true,
    ...results,
    timestamp: new Date().toISOString(),
  });
}
