"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface ProspectSegmentFilters {
  platform?: string;
  status?: string;
  listId?: string;
  temperature?: string;
  scoreMin?: number;
  scoreMax?: number;
  recency?: "recent" | "inactive" | "all";
}

export async function getProspects(filters?: ProspectSegmentFilters) {
  const supabase = await createClient();
  let query = supabase
    .from("prospects")
    .select("*, list:prospect_lists(id, name)")
    .order("created_at", { ascending: false });

  if (filters?.platform) query = query.eq("platform", filters.platform);
  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.listId) query = query.eq("list_id", filters.listId);

  // Recency filter
  if (filters?.recency === "recent") {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    query = query.gte("last_message_at", sevenDaysAgo.toISOString());
  } else if (filters?.recency === "inactive") {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    query = query.or(
      `last_message_at.lt.${thirtyDaysAgo.toISOString()},last_message_at.is.null`,
    );
  }

  const { data } = await query;
  const prospects = (data || []).map((d: Record<string, unknown>) => ({
    ...d,
    list: Array.isArray(d.list) ? d.list[0] || null : d.list,
  }));

  // If we need to filter by score or temperature, fetch scores and filter in-memory
  if (
    filters?.temperature ||
    filters?.scoreMin !== undefined ||
    filters?.scoreMax !== undefined
  ) {
    const prospectIds = prospects.map(
      (p: Record<string, unknown>) => p.id as string,
    );
    if (prospectIds.length === 0) return prospects;

    let scoreQuery = supabase
      .from("prospect_scores")
      .select("prospect_id, total_score, temperature")
      .in("prospect_id", prospectIds);

    if (filters.temperature) {
      scoreQuery = scoreQuery.eq("temperature", filters.temperature);
    }
    if (filters.scoreMin !== undefined) {
      scoreQuery = scoreQuery.gte("total_score", filters.scoreMin);
    }
    if (filters.scoreMax !== undefined) {
      scoreQuery = scoreQuery.lte("total_score", filters.scoreMax);
    }

    const { data: scores } = await scoreQuery;
    const matchingIds = new Set(
      (scores || []).map(
        (s: Record<string, unknown>) => s.prospect_id as string,
      ),
    );
    return prospects.filter((p: Record<string, unknown>) =>
      matchingIds.has(p.id as string),
    );
  }

  return prospects;
}

export async function getProspectSegmentStats() {
  const supabase = await createClient();

  const { data: allProspects } = await supabase.from("prospects").select("id");
  const totalCount = allProspects?.length || 0;

  const { data: scores } = await supabase
    .from("prospect_scores")
    .select("prospect_id, total_score, temperature");

  let hotCount = 0;
  let warmCount = 0;
  let coldCount = 0;
  let totalScore = 0;
  const scoreCount = scores?.length || 0;

  for (const s of scores || []) {
    const temp = s.temperature as string;
    if (temp === "hot") hotCount++;
    else if (temp === "warm") warmCount++;
    else coldCount++;
    totalScore += (s.total_score as number) || 0;
  }

  return {
    total: totalCount,
    hot: hotCount,
    warm: warmCount,
    cold: coldCount,
    avgScore: scoreCount > 0 ? Math.round(totalScore / scoreCount) : 0,
  };
}

export async function addProspect(formData: {
  name: string;
  profile_url?: string;
  platform: string;
  list_id?: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const { error } = await supabase.from("prospects").insert({
    name: formData.name,
    profile_url: formData.profile_url || null,
    platform: formData.platform,
    list_id: formData.list_id || null,
    status: "new",
    created_by: user.id,
  });
  if (error) return { error: "Impossible d'ajouter le prospect." };
  revalidatePath("/prospecting");
  return { success: true };
}

export async function updateProspectStatus(prospectId: string, status: string) {
  const supabase = await createClient();
  const validStatuses = [
    "new",
    "contacted",
    "replied",
    "hot",
    "interested",
    "qualified",
    "booked",
    "converted",
    "lost",
    "not_interested",
  ];
  if (!validStatuses.includes(status)) return { error: "Statut invalide" };

  const { error } = await supabase
    .from("prospects")
    .update({ status })
    .eq("id", prospectId);
  if (error) return { error: "Impossible de mettre à jour le statut." };
  revalidatePath("/prospecting");
  return { success: true };
}

export async function getDailyQuota() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const today = new Date().toISOString().split("T")[0];
  const { data } = await supabase
    .from("daily_quotas")
    .select("*")
    .eq("user_id", user.id)
    .eq("date", today)
    .single();

  if (data) return data;

  // Create today's quota
  const { data: newQuota } = await supabase
    .from("daily_quotas")
    .insert({
      user_id: user.id,
      date: today,
      dms_sent: 0,
      dms_target: 20,
      replies_received: 0,
      bookings_from_dms: 0,
    })
    .select()
    .single();
  return newQuota;
}

export async function incrementDmsSent() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const today = new Date().toISOString().split("T")[0];
  const { data: quota } = await supabase
    .from("daily_quotas")
    .select("id, dms_sent")
    .eq("user_id", user.id)
    .eq("date", today)
    .single();

  if (quota) {
    await supabase
      .from("daily_quotas")
      .update({ dms_sent: quota.dms_sent + 1 })
      .eq("id", quota.id);
  } else {
    await supabase.from("daily_quotas").insert({
      user_id: user.id,
      date: today,
      dms_sent: 1,
      dms_target: 20,
      replies_received: 0,
      bookings_from_dms: 0,
    });
  }
  revalidatePath("/prospecting");
}

export async function incrementReplies() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  const today = new Date().toISOString().split("T")[0];
  const { data: quota } = await supabase
    .from("daily_quotas")
    .select("id, replies_received")
    .eq("user_id", user.id)
    .eq("date", today)
    .single();
  if (quota) {
    await supabase
      .from("daily_quotas")
      .update({ replies_received: quota.replies_received + 1 })
      .eq("id", quota.id);
  } else {
    await supabase.from("daily_quotas").insert({
      user_id: user.id,
      date: today,
      dms_sent: 0,
      dms_target: 20,
      replies_received: 1,
      bookings_from_dms: 0,
    });
  }
  revalidatePath("/prospecting");
}

export async function getProspectLists() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("prospect_lists")
    .select("*")
    .order("created_at", { ascending: false });
  return data || [];
}

export async function getTemplates() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("dm_templates")
    .select("*")
    .order("step")
    .order("variant");
  return data || [];
}

export async function createTemplate(formData: {
  name: string;
  platform: string;
  step: string;
  niche?: string;
  content: string;
  variant: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const { error } = await supabase.from("dm_templates").insert(formData);
  if (error) return { error: "Impossible de créer le template." };
  revalidatePath("/prospecting/templates");
  return { success: true };
}

export async function updateTemplate(
  id: string,
  formData: {
    name?: string;
    platform?: string;
    step?: string;
    niche?: string;
    content?: string;
    variant?: string;
  },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const { error } = await supabase
    .from("dm_templates")
    .update(formData)
    .eq("id", id);
  if (error) return { error: "Impossible de mettre à jour le template." };
  revalidatePath("/prospecting/templates");
  return { success: true };
}

export async function deleteTemplate(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const { error } = await supabase.from("dm_templates").delete().eq("id", id);
  if (error) return { error: "Impossible de supprimer le template." };
  revalidatePath("/prospecting/templates");
  return { success: true };
}

export async function deleteProspect(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const { error } = await supabase.from("prospects").delete().eq("id", id);
  if (error) return { error: "Impossible de supprimer le prospect." };
  revalidatePath("/prospecting");
  return { success: true };
}

// ─── Detail Page Actions ────────────────────────────────────────────

export async function getProspectById(prospectId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { prospect: null, error: "Non authentifié" };

  const { data, error } = await supabase
    .from("prospects")
    .select(
      "*, list:prospect_lists(*), assigned_setter:profiles!prospects_assigned_setter_id_fkey(id, full_name, avatar_url)",
    )
    .eq("id", prospectId)
    .single();

  if (error) return { prospect: null, error: error.message };

  // Normalize joined data
  const prospect = {
    ...data,
    list: Array.isArray(data.list) ? data.list[0] || null : data.list,
    assigned_setter: Array.isArray(data.assigned_setter)
      ? data.assigned_setter[0] || null
      : data.assigned_setter,
  };

  return { prospect, error: null };
}

export async function getProspectScore(prospectId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("prospect_scores")
    .select("*")
    .eq("prospect_id", prospectId)
    .single();
  return data;
}

export async function updateProspect(
  prospectId: string,
  data: {
    name?: string;
    profile_url?: string;
    platform?: string;
    status?: string;
    notes?: string;
    list_id?: string;
    assigned_setter_id?: string;
    auto_follow_up?: boolean;
  },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const { error } = await supabase
    .from("prospects")
    .update(data)
    .eq("id", prospectId);

  if (error) return { error: error.message };

  revalidatePath("/prospecting");
  revalidatePath(`/prospecting/${prospectId}`);
  return { success: true };
}

export async function addProspectMessage(
  prospectId: string,
  message: string,
  direction: "sent" | "received",
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  // Get current conversation history
  const { data: prospect } = await supabase
    .from("prospects")
    .select("conversation_history")
    .eq("id", prospectId)
    .single();

  const history = Array.isArray(prospect?.conversation_history)
    ? prospect.conversation_history
    : [];

  const newMessage = {
    id: crypto.randomUUID(),
    content: message,
    direction,
    timestamp: new Date().toISOString(),
    user_id: user.id,
  };

  const { error } = await supabase
    .from("prospects")
    .update({
      conversation_history: [...history, newMessage],
      last_message_at: new Date().toISOString(),
    })
    .eq("id", prospectId);

  if (error) return { error: error.message };

  // Update daily quota if sent
  if (direction === "sent") {
    await incrementDmsSent();
  } else {
    await incrementReplies();
  }

  revalidatePath(`/prospecting/${prospectId}`);
  return { success: true };
}

export async function convertProspectToDeal(
  prospectId: string,
  dealData: {
    title: string;
    value: number;
    stage_id: string;
  },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  // Get prospect data
  const { data: prospect } = await supabase
    .from("prospects")
    .select("name, profile_url")
    .eq("id", prospectId)
    .single();

  if (!prospect) return { error: "Prospect introuvable" };

  // Create deal
  const { data: deal, error: dealError } = await supabase
    .from("deals")
    .insert({
      title: dealData.title,
      value: dealData.value,
      stage_id: dealData.stage_id,
      source: "prospecting",
      temperature: "warm",
      notes: `Converti depuis prospect: ${prospect.name}`,
    })
    .select()
    .single();

  if (dealError) return { error: dealError.message };

  // Update prospect status
  await supabase
    .from("prospects")
    .update({ status: "booked" })
    .eq("id", prospectId);

  revalidatePath("/prospecting");
  revalidatePath("/crm");
  return { success: true, dealId: deal.id };
}

export async function qualifyProspect(
  prospectId: string,
  params: {
    createDeal: boolean;
    temperature: string;
  },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  // Get prospect data
  const { data: prospect } = await supabase
    .from("prospects")
    .select("name, profile_url, platform")
    .eq("id", prospectId)
    .single();

  if (!prospect) return { error: "Prospect introuvable" };

  // Update prospect status to qualified
  const { error: statusError } = await supabase
    .from("prospects")
    .update({ status: "qualified" })
    .eq("id", prospectId);

  if (statusError) return { error: "Impossible de qualifier le prospect" };

  let dealCreated = false;

  // Optionally create a deal
  if (params.createDeal) {
    // Get the first pipeline stage
    const { data: firstStage } = await supabase
      .from("pipeline_stages")
      .select("id")
      .order("position", { ascending: true })
      .limit(1)
      .single();

    if (firstStage) {
      const { error: dealError } = await supabase
        .from("deals")
        .insert({
          title: `${prospect.name} — Qualification scoring`,
          value: 0,
          stage_id: firstStage.id,
          source: "scoring",
          temperature: params.temperature,
          notes: `Qualifié automatiquement depuis le scoring (${prospect.platform})`,
        })
        .select()
        .single();

      dealCreated = !dealError;
    }
  }

  revalidatePath("/prospecting");
  revalidatePath("/crm");
  return { success: true, dealCreated };
}

export async function getSettersForAssignment() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url")
    .in("role", ["setter", "closer", "manager", "admin"]);
  return data || [];
}

// ─── Google Maps Lead Discovery ─────────────────────────────────────

export async function searchGoogleMapsLeads(params: {
  searchTerm: string;
  location: string;
  maxResults?: number;
}) {
  const { callApifyActor } = await import("@/lib/apify");

  const results = await callApifyActor("compass/crawler-google-places", {
    searchStringsArray: [params.searchTerm],
    locationQuery: params.location,
    maxCrawledPlacesPerSearch: params.maxResults || 20,
    language: "fr",
    scrapeContacts: true,
  });

  if (!results) {
    throw new Error("La recherche Google Maps a échoué. Veuillez réessayer.");
  }

  return (results as Record<string, unknown>[]).map((place) => ({
    name: place.title as string,
    phone: place.phone as string | undefined,
    email:
      (place.email as string) ||
      (place.contactEmails as string[] | undefined)?.[0],
    website: place.website as string | undefined,
    address: place.address as string | undefined,
    rating: place.totalScore as number | undefined,
    reviewCount: place.reviewsCount as number | undefined,
    category: place.categoryName as string | undefined,
    googleMapsUrl: place.url as string | undefined,
    socialLinks: {
      facebook: place.facebookUrl as string | undefined,
      instagram: place.instagramUrl as string | undefined,
      linkedin: place.linkedinUrl as string | undefined,
    },
    source: "google_maps" as const,
  }));
}

export async function importGoogleMapsLead(lead: {
  name: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  category?: string;
  googleMapsUrl?: string;
  platform?: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const { data, error } = await supabase
    .from("prospects")
    .insert({
      user_id: user.id,
      name: lead.name,
      platform: lead.platform || "google_maps",
      status: "new",
      notes: `Source: Google Maps\nAdresse: ${lead.address || ""}\nCatégorie: ${lead.category || ""}\nURL: ${lead.googleMapsUrl || ""}`,
      conversation_history: [],
      metadata: {
        phone: lead.phone,
        email: lead.email,
        website: lead.website,
        source: "google_maps_discovery",
      },
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/prospecting");
  return data;
}
