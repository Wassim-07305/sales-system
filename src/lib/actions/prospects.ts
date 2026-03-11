"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface ProspectRow {
  id: string;
  name: string;
  profile_url: string | null;
  platform: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  created_by: string | null;
  list: { name: string } | null;
}

export async function getMyProspects(): Promise<ProspectRow[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("prospects")
    .select("*, list:prospect_lists(name)")
    .eq("created_by", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  return (data || []).map((d) => ({
    id: d.id as string,
    name: d.name as string,
    profile_url: (d.profile_url ?? null) as string | null,
    platform: (d.platform ?? null) as string | null,
    status: (d.status ?? "new") as string,
    notes: (d.notes ?? null) as string | null,
    created_at: d.created_at as string,
    created_by: (d.created_by ?? null) as string | null,
    list: Array.isArray(d.list) ? (d.list[0] as { name: string }) || null : (d.list as { name: string } | null),
  }));
}

export async function createProspect(data: {
  name: string;
  profile_url?: string;
  platform?: string;
  notes?: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const { error } = await supabase.from("prospects").insert({
    name: data.name,
    profile_url: data.profile_url || null,
    platform: data.platform || null,
    notes: data.notes || null,
    status: "new",
    created_by: user.id,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/prospects");
}

export async function updateProspectStatus(id: string, status: string) {
  const supabase = await createClient();
  await supabase.from("prospects").update({ status }).eq("id", id);
  revalidatePath("/prospects");
}

export async function updateProspectNotes(id: string, notes: string) {
  const supabase = await createClient();
  await supabase.from("prospects").update({ notes }).eq("id", id);
  revalidatePath("/prospects");
}

export async function deleteProspect(id: string) {
  const supabase = await createClient();
  await supabase.from("prospects").delete().eq("id", id);
  revalidatePath("/prospects");
}
