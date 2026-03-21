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
  created_by_name: string | null;
  list: { name: string } | null;
}

function mapProspectRow(
  d: Record<string, unknown>,
): Omit<ProspectRow, "created_by_name"> {
  return {
    id: d.id as string,
    name: d.name as string,
    profile_url: (d.profile_url ?? null) as string | null,
    platform: (d.platform ?? null) as string | null,
    status: (d.status ?? "new") as string,
    notes: (d.notes ?? null) as string | null,
    created_at: d.created_at as string,
    created_by: (d.created_by ?? null) as string | null,
    list: Array.isArray(d.list)
      ? (d.list[0] as { name: string }) || null
      : (d.list as { name: string } | null),
  };
}

export async function getMyProspects(): Promise<ProspectRow[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  // Récupérer le profil pour connaître le rôle et le lien B2B/B2C
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, matched_entrepreneur_id, full_name")
    .eq("id", user.id)
    .single();

  if (!profile) return [];

  // Récupérer les prospects de l'utilisateur courant
  const { data: ownProspects } = await supabase
    .from("prospects")
    .select("*, list:prospect_lists(name)")
    .eq("created_by", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  const ownRows: ProspectRow[] = (ownProspects || []).map((d) => ({
    ...mapProspectRow(d as Record<string, unknown>),
    created_by_name: profile.full_name,
  }));

  // Si B2B : récupérer aussi les prospects des setters liés
  if (profile.role === "client_b2b") {
    const { data: linkedSetters } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("matched_entrepreneur_id", user.id)
      .eq("role", "client_b2c");

    if (linkedSetters && linkedSetters.length > 0) {
      const setterIds = linkedSetters.map((s) => s.id);
      const setterNameMap = new Map(
        linkedSetters.map((s) => [s.id, s.full_name]),
      );

      const { data: setterProspects } = await supabase
        .from("prospects")
        .select("*, list:prospect_lists(name)")
        .in("created_by", setterIds)
        .order("created_at", { ascending: false })
        .limit(100);

      const setterRows: ProspectRow[] = (setterProspects || []).map((d) => ({
        ...mapProspectRow(d as Record<string, unknown>),
        created_by_name: setterNameMap.get(d.created_by as string) ?? null,
      }));

      // Fusionner et trier par date décroissante
      return [...ownRows, ...setterRows].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    }
  }

  // Si B2C avec un entrepreneur lié : récupérer aussi les prospects du B2B
  if (profile.role === "client_b2c" && profile.matched_entrepreneur_id) {
    const { data: b2bProfile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", profile.matched_entrepreneur_id)
      .single();

    const { data: b2bProspects } = await supabase
      .from("prospects")
      .select("*, list:prospect_lists(name)")
      .eq("created_by", profile.matched_entrepreneur_id)
      .order("created_at", { ascending: false })
      .limit(100);

    const b2bRows: ProspectRow[] = (b2bProspects || []).map((d) => ({
      ...mapProspectRow(d as Record<string, unknown>),
      created_by_name: b2bProfile?.full_name ?? null,
    }));

    return [...ownRows, ...b2bRows].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }

  return ownRows;
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

  let { error } = await supabase.from("prospects").insert({
    name: data.name,
    profile_url: data.profile_url || null,
    platform: data.platform || null,
    notes: data.notes || null,
    status: "new",
    user_id: user.id,
  });
  // Fallback if user_id column doesn't exist yet
  if (error?.message?.includes("user_id")) {
    ({ error } = await supabase.from("prospects").insert({
      name: data.name,
      profile_url: data.profile_url || null,
      platform: data.platform || null,
      notes: data.notes || null,
      status: "new",
    }));
  }
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
