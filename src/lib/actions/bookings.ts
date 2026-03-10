"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// ─── Queries ────────────────────────────────────────────────────────

export async function getBookingById(bookingId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
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

  revalidatePath("/bookings");
  return { booking: data };
}

export async function updateBookingStatus(bookingId: string, status: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const { error } = await supabase
    .from("bookings")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", bookingId);

  if (error) return { error: error.message };

  revalidatePath("/bookings");
  revalidatePath(`/bookings/${bookingId}`);
  return { success: true };
}

export async function updateBooking(bookingId: string, data: {
  prospect_name?: string;
  prospect_email?: string;
  prospect_phone?: string;
  scheduled_at?: string;
  duration_minutes?: number;
  slot_type?: string;
  notes?: string;
  assigned_to?: string;
  meeting_link?: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const { error } = await supabase
    .from("bookings")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", bookingId);

  if (error) return { error: error.message };

  revalidatePath("/bookings");
  revalidatePath(`/bookings/${bookingId}`);
  return { success: true };
}

export async function rescheduleBooking(bookingId: string, newDate: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const { error } = await supabase
    .from("bookings")
    .update({
      scheduled_at: newDate,
      status: "rescheduled",
      updated_at: new Date().toISOString(),
    })
    .eq("id", bookingId);

  if (error) return { error: error.message };

  revalidatePath("/bookings");
  revalidatePath(`/bookings/${bookingId}`);
  return { success: true };
}

export async function deleteBooking(bookingId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const { error } = await supabase
    .from("bookings")
    .delete()
    .eq("id", bookingId);

  if (error) return { error: error.message };

  revalidatePath("/bookings");
  return { success: true };
}
