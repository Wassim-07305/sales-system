"use server";

import { createClient } from "@/lib/supabase/server";

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  type: "booking" | "video" | "event";
  status: string;
  link: string;
}

export async function getCalendarEvents(
  month: number,
  year: number,
): Promise<CalendarEvent[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const startDate = new Date(year, month - 1, 1).toISOString();
  const endDate = new Date(year, month, 0, 23, 59, 59).toISOString();

  // Fetch bookings
  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, date, time, status, contact_name, contact_email, booking_type")
    .gte("date", startDate.split("T")[0])
    .lte("date", endDate.split("T")[0])
    .order("date");

  // Fetch video rooms (appels de groupe)
  const { data: videoRooms } = await supabase
    .from("video_rooms")
    .select("id, title, scheduled_at, status")
    .gte("scheduled_at", startDate)
    .lte("scheduled_at", endDate)
    .order("scheduled_at");

  // Fetch community events
  const { data: events } = await supabase
    .from("community_posts")
    .select("id, title, event_date, channel")
    .eq("type", "event")
    .gte("event_date", startDate)
    .lte("event_date", endDate)
    .order("event_date");

  const calendarEvents: CalendarEvent[] = [
    ...(bookings || []).map((b) => ({
      id: `booking-${b.id}`,
      title: `RDV: ${b.contact_name || "Sans nom"}`,
      date: b.date as string,
      time: (b.time as string) || "",
      type: "booking" as const,
      status: (b.status as string) || "confirmed",
      link: "/bookings",
    })),
    ...(videoRooms || []).map((v) => ({
      id: `video-${v.id}`,
      title: (v.title as string) || "Appel de groupe",
      date: ((v.scheduled_at as string) || "").split("T")[0] || "",
      time:
        ((v.scheduled_at as string) || "").split("T")[1]?.substring(0, 5) || "",
      type: "video" as const,
      status: (v.status as string) || "scheduled",
      link: `/chat/video/${v.id}`,
    })),
    ...(events || []).map((e) => ({
      id: `event-${e.id}`,
      title: (e.title as string) || "Événement",
      date: ((e.event_date as string) || "").split("T")[0] || "",
      time:
        ((e.event_date as string) || "").split("T")[1]?.substring(0, 5) || "",
      type: "event" as const,
      status: "confirmed",
      link: "/community",
    })),
  ];

  return calendarEvents;
}
