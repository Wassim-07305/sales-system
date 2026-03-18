import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { BookingDashboard } from "./booking-dashboard";
import {
  getBookingPages,
  getBookingLeads,
  getBookingKPIs,
  getBookingChartData,
} from "@/lib/actions/booking-pages";

export default async function BookingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ pages }, { leads }, kpis, chartData] = await Promise.all([
    getBookingPages(),
    getBookingLeads(),
    getBookingKPIs({ period: "quarter" }),
    getBookingChartData({ period: "quarter" }),
  ]);

  return (
    <div>
      <PageHeader
        title="Booking"
        description="Gérez vos pages de réservation et vos leads"
      />
      <BookingDashboard
        pages={pages}
        leads={leads}
        userId={user.id}
        initialKpis={kpis}
        initialChartData={chartData}
      />
    </div>
  );
}
