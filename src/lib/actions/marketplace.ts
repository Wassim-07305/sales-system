"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getMarketplaceListings() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const { data, error } = await supabase
    .from("marketplace_listings")
    .select("*, entrepreneur:profiles(id, full_name, company)")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data || []).map((d: Record<string, unknown>) => ({
    ...d,
    entrepreneur: Array.isArray(d.entrepreneur)
      ? d.entrepreneur[0] || null
      : d.entrepreneur,
  }));
}

export async function getMyApplications() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const { data, error } = await supabase
    .from("marketplace_applications")
    .select("*, listing:marketplace_listings(id, title)")
    .eq("setter_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function applyToListing(listingId: string, message: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  // Check if already applied
  const { data: existing } = await supabase
    .from("marketplace_applications")
    .select("id")
    .eq("listing_id", listingId)
    .eq("setter_id", user.id)
    .maybeSingle();

  if (existing) throw new Error("Vous avez déjà postulé à cette offre.");

  const { data, error } = await supabase
    .from("marketplace_applications")
    .insert({
      listing_id: listingId,
      setter_id: user.id,
      message,
      status: "pending",
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/marketplace");
  return data;
}

export async function getListingApplications(listingId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const { data, error } = await supabase
    .from("marketplace_applications")
    .select("*, setter:profiles(id, full_name, email)")
    .eq("listing_id", listingId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data || []).map((d: Record<string, unknown>) => ({
    ...d,
    setter: Array.isArray(d.setter) ? d.setter[0] || null : d.setter,
  }));
}
