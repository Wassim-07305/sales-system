import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  getUpcomingEvents,
  getEventParticipantCounts,
  getUserRsvps,
} from "@/lib/actions/community";
import { EventsView } from "./events-view";

export default async function EventsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isAdmin = profile?.role === "admin" || profile?.role === "manager";

  const { upcoming, past } = await getUpcomingEvents();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allEvents = [...upcoming, ...past] as any[];
  const allIds = allEvents.map((e) => e.id as string);

  const [participantCounts, userRsvps] = await Promise.all([
    getEventParticipantCounts(allIds),
    getUserRsvps(user.id, allIds),
  ]);

  return (
    <EventsView
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      upcoming={upcoming as any}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      past={past as any}
      participantCounts={participantCounts}
      userRsvpIds={Array.from(userRsvps)}
      isAdmin={isAdmin}
      userId={user.id}
    />
  );
}
