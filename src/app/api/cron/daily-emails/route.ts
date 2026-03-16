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
    return NextResponse.json({ error: "Service role key not configured" }, { status: 500 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey
  );

  const results = { digests: 0, reminders: 0, callReminders: 0, sequenceMessages: 0, errors: 0 };

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

    const uniqueUserIds = [...new Set((usersWithUnread || []).map((n) => n.user_id))];

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

  // --- 2. Booking Reminders (next 24h) ---
  try {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const { data: upcomingBookings } = await supabase
      .from("bookings")
      .select("id, prospect_name, prospect_email, scheduled_at, slot_type, user_id")
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

        if (!assignee?.email) continue;

        const { sendBookingReminder } = await import("@/lib/actions/email");
        await sendBookingReminder({
          email: assignee.email,
          name: assignee.full_name || "",
          date: new Date(booking.scheduled_at).toLocaleString("fr-FR", {
            dateStyle: "long",
            timeStyle: "short",
          }),
          type: booking.slot_type || "Rendez-vous",
          prospectName: booking.prospect_name || "Client",
        });
        results.reminders++;
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
          await supabase.from("follow_up_tasks").update({ completed: true, completed_at: now.toISOString() }).eq("id", task.id);
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

        await supabase.from("follow_up_tasks").update({ completed: true, completed_at: now.toISOString() }).eq("id", task.id);
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
