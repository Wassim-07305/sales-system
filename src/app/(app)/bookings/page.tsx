import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { BookingCalendar } from "./booking-calendar";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import Link from "next/link";

export default async function BookingsPage() {
  const supabase = await createClient();

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
        <Link href="/bookings/settings">
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Paramètres
          </Button>
        </Link>
      </PageHeader>
      <BookingCalendar initialBookings={bookings || []} />
    </div>
  );
}
