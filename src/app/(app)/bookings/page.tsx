import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { BookingCalendar } from "./booking-calendar";
import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";
import Link from "next/link";

export default async function BookingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: bookings } = await supabase
    .from("bookings")
    .select("*, assigned_user:profiles!bookings_assigned_to_fkey(*)")
    .order("scheduled_at", { ascending: true });

  return (
    <div>
      <PageHeader
        title="Bookings"
        description="Calendrier et gestion des rendez-vous"
      >
        <Button variant="outline" asChild>
          <Link href="/bookings/calendar-sync">
            <Calendar className="h-4 w-4 mr-2" />
            Sync Calendrier
          </Link>
        </Button>
      </PageHeader>
      <BookingCalendar initialBookings={bookings || []} />
    </div>
  );
}
