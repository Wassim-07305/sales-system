"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { notify } from "@/lib/actions/notifications";

// ─── Queries ────────────────────────────────────────────────────────

export async function getBookingById(bookingId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { booking: null, error: "Non authentifié" };

  const { data, error } = await supabase
    .from("bookings")
    .select("*, assigned_user:profiles!bookings_assigned_to_fkey(*)")
    .eq("id", bookingId)
    .single();

  if (error) return { booking: null, error: error.message };
  return { booking: data, error: null };
}

export async function getTeamMembers() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .in("role", ["setter", "closer", "manager", "admin"]);
  return data || [];
}

// ─── Mutations ──────────────────────────────────────────────────────

export async function createBooking(params: {
  prospect_name: string;
  prospect_email?: string;
  prospect_phone?: string;
  scheduled_at: string;
  duration_minutes: number;
  slot_type: string;
  notes?: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  // Empêcher les bookings dans le passé
  if (new Date(params.scheduled_at) < new Date()) {
    return { error: "Impossible de créer un booking dans le passé" };
  }

  // Vérifier les conflits horaires pour le même utilisateur
  const scheduledStart = new Date(params.scheduled_at);
  const scheduledEnd = new Date(
    scheduledStart.getTime() + params.duration_minutes * 60 * 1000,
  );

  const { data: existing } = await supabase
    .from("bookings")
    .select("id, scheduled_at, duration_minutes")
    .eq("assigned_to", user.id)
    .neq("status", "cancelled")
    .gte(
      "scheduled_at",
      new Date(scheduledStart.getTime() - 24 * 60 * 60 * 1000).toISOString(),
    )
    .lte("scheduled_at", scheduledEnd.toISOString());

  const hasConflict = (existing || []).some((b) => {
    const bStart = new Date(b.scheduled_at);
    const bEnd = new Date(
      bStart.getTime() + (b.duration_minutes || 30) * 60 * 1000,
    );
    return scheduledStart < bEnd && scheduledEnd > bStart;
  });

  if (hasConflict) {
    return { error: "Un booking existe déjà sur ce créneau horaire" };
  }

  const { data, error } = await supabase
    .from("bookings")
    .insert({
      prospect_name: params.prospect_name,
      prospect_email: params.prospect_email || null,
      prospect_phone: params.prospect_phone || null,
      scheduled_at: params.scheduled_at,
      duration_minutes: params.duration_minutes,
      slot_type: params.slot_type,
      notes: params.notes || null,
      status: "confirmed",
      assigned_to: user.id,
    })
    .select("*, assigned_user:profiles!bookings_assigned_to_fkey(*)")
    .single();

  if (error) return { error: error.message };

  // Notify assigned user about new booking (in-app + push)
  const scheduledDate = new Date(params.scheduled_at).toLocaleDateString(
    "fr-FR",
    {
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    },
  );
  notify(
    user.id,
    "Nouveau booking confirmé",
    `RDV avec ${params.prospect_name} le ${scheduledDate}`,
    {
      type: "booking",
      link: `/bookings/${data.id}`,
    },
  );

  revalidatePath("/bookings");
  return { booking: data };
}

export async function updateBookingStatus(bookingId: string, status: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const validStatuses = [
    "confirmed",
    "completed",
    "cancelled",
    "rescheduled",
    "no_show",
  ];
  if (!validStatuses.includes(status)) return { error: "Statut invalide" };

  // Get booking details for notification
  const { data: booking } = await supabase
    .from("bookings")
    .select("prospect_name, assigned_to")
    .eq("id", bookingId)
    .single();

  const { error } = await supabase
    .from("bookings")
    .update({ status })
    .eq("id", bookingId);

  if (error) return { error: error.message };

  // Notify assigned user about status change (in-app + push)
  const statusLabels: Record<string, string> = {
    confirmed: "confirmé",
    completed: "terminé",
    cancelled: "annulé",
    rescheduled: "replanifié",
    no_show: "absent (no-show)",
  };
  const targetUser = booking?.assigned_to || user.id;
  notify(
    targetUser,
    `Booking ${statusLabels[status] || status}`,
    `Le RDV avec ${booking?.prospect_name || "un prospect"} a été ${statusLabels[status] || "mis à jour"}.`,
    {
      type: "booking",
      link: `/bookings/${bookingId}`,
    },
  );

  revalidatePath("/bookings");
  revalidatePath(`/bookings/${bookingId}`);
  return { success: true };
}

export async function updateBooking(
  bookingId: string,
  data: {
    prospect_name?: string;
    prospect_email?: string;
    prospect_phone?: string;
    scheduled_at?: string;
    duration_minutes?: number;
    slot_type?: string;
    notes?: string;
    assigned_to?: string;
    meeting_link?: string;
  },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const { error } = await supabase
    .from("bookings")
    .update({ ...data })
    .eq("id", bookingId);

  if (error) return { error: error.message };

  revalidatePath("/bookings");
  revalidatePath(`/bookings/${bookingId}`);
  return { success: true };
}

export async function rescheduleBooking(bookingId: string, newDate: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  // Empêcher les reschedule dans le passé
  if (new Date(newDate) < new Date()) {
    return { error: "Impossible de replanifier dans le passé" };
  }

  // Get booking details for notification
  const { data: booking } = await supabase
    .from("bookings")
    .select("prospect_name, assigned_to")
    .eq("id", bookingId)
    .single();

  if (!booking) return { error: "Booking introuvable" };

  const { error } = await supabase
    .from("bookings")
    .update({
      scheduled_at: newDate,
      status: "rescheduled",
    })
    .eq("id", bookingId);

  if (error) return { error: error.message };

  // Notify assigned user about reschedule (in-app + push)
  if (booking?.assigned_to) {
    const formattedDate = new Date(newDate).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    });
    notify(
      booking.assigned_to,
      "Booking replanifié",
      `Le RDV avec ${booking.prospect_name || "un prospect"} a été déplacé au ${formattedDate}`,
      {
        type: "booking",
        link: `/bookings/${bookingId}`,
      },
    );
  }

  revalidatePath("/bookings");
  revalidatePath(`/bookings/${bookingId}`);
  return { success: true };
}

export async function deleteBooking(bookingId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const { error } = await supabase
    .from("bookings")
    .delete()
    .eq("id", bookingId);

  if (error) return { error: error.message };

  revalidatePath("/bookings");
  return { success: true };
}
