"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { notify } from "@/lib/actions/notifications";
import type {
  BookingPage,
  BookingAvailability,
  BookingException,
  BookingLead,
  AvailableSlot,
  PublicBookingPageData,
} from "@/lib/types/database";

// ─── Auth helper ────────────────────────────────────────────────────────────

async function requireAuth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");
  return { supabase, user };
}

// ═══════════════════════════════════════════════════════════════════════════
// Booking Pages CRUD
// ═══════════════════════════════════════════════════════════════════════════

export async function getBookingPages() {
  const { supabase } = await requireAuth();

  const { data, error } = await supabase
    .from("booking_pages")
    .select(
      "*, creator:profiles!booking_pages_created_by_fkey(id, full_name, avatar_url)",
    )
    .order("created_at", { ascending: false });

  if (error) return { pages: [] as BookingPage[], error: error.message };
  return { pages: data as BookingPage[], error: null };
}

export async function createBookingPage(params: {
  slug: string;
  title: string;
  description?: string;
  brand_color?: string;
  slot_duration?: number;
  buffer_minutes?: number;
  min_notice_hours?: number;
  max_days_ahead?: number;
  qualification_fields?: unknown[];
  timezone?: string;
  og_title?: string;
  og_description?: string;
  email_visible?: boolean;
  email_required?: boolean;
}) {
  const { supabase, user } = await requireAuth();

  const { data, error } = await supabase
    .from("booking_pages")
    .insert({
      ...params,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) return { page: null, error: error.message };

  revalidatePath("/bookings");
  return { page: data as BookingPage, error: null };
}

export async function updateBookingPage(
  pageId: string,
  params: Partial<{
    slug: string;
    title: string;
    description: string | null;
    brand_color: string;
    slot_duration: number;
    buffer_minutes: number;
    min_notice_hours: number;
    max_days_ahead: number;
    qualification_fields: unknown[];
    timezone: string;
    og_title: string | null;
    og_description: string | null;
    og_image_url: string | null;
    email_visible: boolean;
    email_required: boolean;
    is_active: boolean;
  }>,
) {
  const { supabase } = await requireAuth();

  const { error } = await supabase
    .from("booking_pages")
    .update(params)
    .eq("id", pageId);

  if (error) return { error: error.message };

  revalidatePath("/bookings");
  return { error: null };
}

export async function deleteBookingPage(pageId: string) {
  const { supabase } = await requireAuth();

  const { error } = await supabase
    .from("booking_pages")
    .delete()
    .eq("id", pageId);

  if (error) return { error: error.message };

  revalidatePath("/bookings");
  return { error: null };
}

// ═══════════════════════════════════════════════════════════════════════════
// Booking Availability
// ═══════════════════════════════════════════════════════════════════════════

export async function getBookingAvailability(pageId: string) {
  const { supabase } = await requireAuth();

  const { data, error } = await supabase
    .from("booking_availability")
    .select(
      "*, closer:profiles!booking_availability_closer_id_fkey(id, full_name, avatar_url)",
    )
    .eq("booking_page_id", pageId)
    .order("day_of_week")
    .order("start_time");

  if (error)
    return { availability: [] as BookingAvailability[], error: error.message };
  return { availability: data as BookingAvailability[], error: null };
}

export async function createAvailability(params: {
  booking_page_id: string;
  closer_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  priority?: number;
}) {
  const { supabase } = await requireAuth();

  const { data, error } = await supabase
    .from("booking_availability")
    .insert(params)
    .select()
    .single();

  if (error) return { error: error.message };

  revalidatePath("/bookings");
  return { availability: data as BookingAvailability, error: null };
}

export async function deleteAvailability(availabilityId: string) {
  const { supabase } = await requireAuth();

  const { error } = await supabase
    .from("booking_availability")
    .delete()
    .eq("id", availabilityId);

  if (error) return { error: error.message };

  revalidatePath("/bookings");
  return { error: null };
}

export async function updateCloserPriority(
  availabilityId: string,
  priority: number,
) {
  const { supabase } = await requireAuth();

  const { error } = await supabase
    .from("booking_availability")
    .update({ priority })
    .eq("id", availabilityId);

  if (error) return { error: error.message };
  return { error: null };
}

// ═══════════════════════════════════════════════════════════════════════════
// Booking Exceptions
// ═══════════════════════════════════════════════════════════════════════════

export async function getBookingExceptions(pageId: string) {
  const { supabase } = await requireAuth();

  const { data, error } = await supabase
    .from("booking_exceptions")
    .select(
      "*, closer:profiles!booking_exceptions_closer_id_fkey(id, full_name)",
    )
    .eq("booking_page_id", pageId)
    .order("exception_date", { ascending: false });

  if (error)
    return { exceptions: [] as BookingException[], error: error.message };
  return { exceptions: data as BookingException[], error: null };
}

export async function createException(params: {
  booking_page_id: string;
  closer_id?: string;
  exception_date: string;
  type: "blocked" | "override";
  start_time?: string;
  end_time?: string;
  reason?: string;
}) {
  const { supabase } = await requireAuth();

  const { data, error } = await supabase
    .from("booking_exceptions")
    .insert(params)
    .select()
    .single();

  if (error) return { error: error.message };

  revalidatePath("/bookings");
  return { exception: data as BookingException, error: null };
}

export async function deleteException(exceptionId: string) {
  const { supabase } = await requireAuth();

  const { error } = await supabase
    .from("booking_exceptions")
    .delete()
    .eq("id", exceptionId);

  if (error) return { error: error.message };

  revalidatePath("/bookings");
  return { error: null };
}

// ═══════════════════════════════════════════════════════════════════════════
// Analytics
// ═══════════════════════════════════════════════════════════════════════════

export async function getBookingKPIs(params?: {
  pageId?: string;
  userId?: string;
  period?: "day" | "week" | "month" | "quarter" | "year";
}) {
  const { supabase } = await requireAuth();

  // Date range based on period
  const now = new Date();
  let startDate: Date;
  switch (params?.period || "month") {
    case "day":
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case "week":
      startDate = new Date(now);
      startDate.setDate(now.getDate() - now.getDay() + 1);
      startDate.setHours(0, 0, 0, 0);
      break;
    case "quarter":
      startDate = new Date(
        now.getFullYear(),
        Math.floor(now.getMonth() / 3) * 3,
        1,
      );
      break;
    case "year":
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    default: // month
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  }
  const startStr = startDate.toISOString();

  // Views count
  let viewsQuery = supabase
    .from("booking_page_views")
    .select("id", { count: "exact", head: true })
    .gte("created_at", startStr);
  if (params?.pageId)
    viewsQuery = viewsQuery.eq("booking_page_id", params.pageId);

  // Leads count
  let leadsQuery = supabase
    .from("booking_leads")
    .select("id", { count: "exact", head: true })
    .gte("created_at", startStr);
  if (params?.pageId)
    leadsQuery = leadsQuery.eq("booking_page_id", params.pageId);

  // Bookings count (from booking pages)
  let bookingsQuery = supabase
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .not("booking_page_id", "is", null)
    .gte("created_at", startStr);
  if (params?.pageId)
    bookingsQuery = bookingsQuery.eq("booking_page_id", params.pageId);
  if (params?.userId)
    bookingsQuery = bookingsQuery.eq("closer_id", params.userId);

  const [viewsRes, leadsRes, bookingsRes] = await Promise.all([
    viewsQuery,
    leadsQuery,
    bookingsQuery,
  ]);

  const views = viewsRes.count || 0;
  const contacts = leadsRes.count || 0;
  const bookings = bookingsRes.count || 0;
  const viewToContact = views > 0 ? Math.round((contacts / views) * 100) : 0;
  const contactToBooking =
    contacts > 0 ? Math.round((bookings / contacts) * 100) : 0;

  return {
    views,
    contacts,
    bookings,
    viewToContact,
    contactToBooking,
  };
}

export async function getBookingChartData(params?: {
  pageId?: string;
  period?: "day" | "week" | "month" | "quarter" | "year";
}) {
  const { supabase } = await requireAuth();

  const period = params?.period || "month";
  const now = new Date();
  let startDate: Date;
  let groupBy: "day" | "week" | "month";

  switch (period) {
    case "day":
      startDate = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - 7,
      );
      groupBy = "day";
      break;
    case "week":
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 28);
      groupBy = "week";
      break;
    case "quarter":
      startDate = new Date(
        now.getFullYear(),
        Math.floor(now.getMonth() / 3) * 3,
        1,
      );
      groupBy = "week";
      break;
    case "year":
      startDate = new Date(now.getFullYear(), 0, 1);
      groupBy = "month";
      break;
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      groupBy = "day";
  }

  let query = supabase
    .from("bookings")
    .select("created_at, status")
    .not("booking_page_id", "is", null)
    .gte("created_at", startDate.toISOString())
    .order("created_at");

  if (params?.pageId) query = query.eq("booking_page_id", params.pageId);

  const { data: bookings } = await query;

  // Group by period
  const grouped: Record<string, number> = {};
  for (const b of bookings || []) {
    const d = new Date(b.created_at);
    let key: string;
    if (groupBy === "day") {
      key = d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
    } else if (groupBy === "week") {
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay() + 1);
      key = `S${Math.ceil((weekStart.getDate() + weekStart.getDay()) / 7)}`;
    } else {
      key = d.toLocaleDateString("fr-FR", { month: "short" });
    }
    grouped[key] = (grouped[key] || 0) + 1;
  }

  return Object.entries(grouped).map(([label, count]) => ({
    label,
    bookings: count,
  }));
}

// ═══════════════════════════════════════════════════════════════════════════
// Booking Leads
// ═══════════════════════════════════════════════════════════════════════════

export async function getBookingLeads(params?: {
  pageId?: string;
  status?: string;
}) {
  const { supabase } = await requireAuth();

  let query = supabase
    .from("booking_leads")
    .select(
      "*, booking:bookings(*), assigned_user:profiles!booking_leads_assigned_to_fkey(id, full_name, avatar_url), booking_page:booking_pages!booking_leads_booking_page_id_fkey(id, title, slug)",
    )
    .order("created_at", { ascending: false });

  if (params?.pageId) query = query.eq("booking_page_id", params.pageId);
  if (params?.status) query = query.eq("status", params.status);

  const { data, error } = await query;
  if (error) return { leads: [] as BookingLead[], error: error.message };
  return { leads: data as BookingLead[], error: null };
}

export async function getBookingLeadStats() {
  const { supabase } = await requireAuth();

  const { data } = await supabase.from("booking_leads").select("status");

  const stats = { new: 0, qualified: 0, booked: 0, disqualified: 0, lost: 0 };
  for (const lead of data || []) {
    if (lead.status in stats) {
      stats[lead.status as keyof typeof stats]++;
    }
  }
  return stats;
}

// ═══════════════════════════════════════════════════════════════════════════
// Public Booking (no auth required — use RPCs)
// ═══════════════════════════════════════════════════════════════════════════

export async function getPublicBookingPage(slug: string) {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_booking_page_by_slug", {
    _slug: slug,
  });

  if (error || !data)
    return { page: null, error: error?.message || "Page introuvable" };
  return { page: data as PublicBookingPageData, error: null };
}

export async function getAvailableSlots(slug: string, date: string) {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_available_slots", {
    _slug: slug,
    _date: date,
  });

  if (error) return { slots: [] as AvailableSlot[], error: error.message };
  return { slots: (data || []) as AvailableSlot[], error: null };
}

export async function captureBookingLead(params: {
  pageSlug: string;
  name: string;
  email?: string;
  phone?: string;
  qualification?: Record<string, unknown>;
}) {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("capture_booking_lead", {
    _page_slug: params.pageSlug,
    _name: params.name,
    _email: params.email || null,
    _phone: params.phone || null,
    _qualification: params.qualification || {},
  });

  if (error) return { leadId: null, error: error.message };
  return { leadId: data as string, error: null };
}

export async function createPublicBooking(params: {
  pageSlug: string;
  leadId: string;
  date: string;
  startTime: string;
  name: string;
  email: string;
  phone?: string;
}) {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("create_booking_public", {
    _page_slug: params.pageSlug,
    _lead_id: params.leadId,
    _date: params.date,
    _start_time: params.startTime,
    _name: params.name,
    _email: params.email,
    _phone: params.phone || null,
  });

  if (error) return { bookingId: null, error: error.message };

  // Notify admins about new public booking
  const authSupabase = await createClient();
  const { data: admins } = await authSupabase
    .from("profiles")
    .select("id")
    .in("role", ["admin", "manager"]);

  for (const admin of admins || []) {
    notify(
      admin.id,
      "Nouveau RDV booking page",
      `${params.name} a réservé un créneau le ${params.date} à ${params.startTime}`,
      { type: "booking", link: "/bookings" },
    );
  }

  revalidatePath("/bookings");
  return { bookingId: data as string, error: null };
}

export async function trackBookingPageView(slug: string, referrer?: string) {
  const supabase = await createClient();
  await supabase.rpc("track_booking_page_view", {
    _slug: slug,
    _referrer: referrer || null,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// Call Result (extends existing bookings)
// ═══════════════════════════════════════════════════════════════════════════

export async function saveCallResult(
  bookingId: string,
  params: {
    call_result: string;
    objections?: string;
    follow_up_notes?: string;
    follow_up_date?: string;
  },
) {
  const { supabase } = await requireAuth();

  const statusMap: Record<string, string> = {
    vente_realisee: "completed",
    non_realisee: "completed",
    suivi_prevu: "completed",
    no_show: "no_show",
  };

  const status = statusMap[params.call_result] || "completed";

  const { error } = await supabase
    .from("bookings")
    .update({
      call_result: params.call_result,
      objections: params.objections || null,
      follow_up_notes: params.follow_up_notes || null,
      follow_up_date: params.follow_up_date || null,
      status,
    })
    .eq("id", bookingId);

  if (error) return { error: error.message };

  revalidatePath("/bookings");
  revalidatePath(`/bookings/${bookingId}`);
  return { error: null };
}

// ═══════════════════════════════════════════════════════════════════════════
// Closers list (for availability assignment)
// ═══════════════════════════════════════════════════════════════════════════

export async function getClosers() {
  const { supabase } = await requireAuth();

  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, role")
    .in("role", ["closer", "setter", "manager", "admin"])
    .order("full_name");

  return data || [];
}
