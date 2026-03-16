import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const CRON_SECRET = process.env.CRON_SECRET;

/**
 * Video call reminders cron — triggered every 2 hours.
 * Sends push notifications for upcoming group calls within the next 2 hours.
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
  const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);

  // Find upcoming group calls in the next 2 hours
  const { data: upcomingCalls } = await supabase
    .from("group_calls")
    .select("id, title, scheduled_at, participants")
    .gte("scheduled_at", now.toISOString())
    .lte("scheduled_at", twoHoursLater.toISOString())
    .eq("status", "scheduled");

  if (!upcomingCalls || upcomingCalls.length === 0) {
    return NextResponse.json({ message: "No upcoming calls", notified: 0 });
  }

  let notified = 0;

  for (const call of upcomingCalls) {
    const scheduledAt = new Date(call.scheduled_at as string);
    const timeStr = scheduledAt.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });

    // Get participants or notify all active users
    const participants = (call.participants as string[]) || [];

    let userIds: string[] = [];
    if (participants.length > 0) {
      userIds = participants;
    } else {
      // Notify all setters + admin if no specific participants
      const { data: users } = await supabase
        .from("profiles")
        .select("id")
        .in("role", ["admin", "manager", "setter", "closer", "client_b2c"]);
      userIds = (users || []).map((u) => u.id as string);
    }

    // Create notifications
    for (const userId of userIds) {
      await supabase.from("notifications").insert({
        user_id: userId,
        title: `Appel de groupe dans ${Math.round((scheduledAt.getTime() - now.getTime()) / 60000)} min`,
        body: `${call.title || "Appel de groupe"} à ${timeStr}. Rejoins la salle vidéo !`,
        type: "video_reminder",
        link: `/chat/video/${call.id}`,
        read: false,
      });
      notified++;
    }
  }

  return NextResponse.json({
    message: "Video reminders sent",
    calls: upcomingCalls.length,
    notified,
  });
}
