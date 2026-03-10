import { notFound } from "next/navigation";
import { getBookingById, getTeamMembers } from "@/lib/actions/bookings";
import { BookingDetail } from "./booking-detail";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function BookingPage({ params }: Props) {
  const { id } = await params;

  const [bookingResult, members] = await Promise.all([
    getBookingById(id),
    getTeamMembers(),
  ]);

  if (bookingResult.error || !bookingResult.booking) {
    notFound();
  }

  return (
    <BookingDetail
      booking={bookingResult.booking}
      teamMembers={members}
    />
  );
}
