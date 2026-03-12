import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { BookingCalendar } from "./booking-calendar";
import { BookingsExportButton } from "./bookings-export-button";
import { NewBookingDialog } from "./new-booking-dialog";

export default async function BookingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
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
        <div className="flex items-center gap-2">
          <NewBookingDialog />
          <BookingsExportButton />
        </div>
      </PageHeader>
      <BookingCalendar initialBookings={bookings || []} />
    </div>
  );
}
