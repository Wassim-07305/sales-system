"use server";

import { createClient } from "@/lib/supabase/server";

export interface MatchingDuo {
  setterId: string;
  setterName: string;
  setterAvatar: string | null;
  entrepreneurId: string;
  entrepreneurName: string;
  entrepreneurAvatar: string | null;
  dealCount: number;
  totalRevenue: number;
  conversationCount: number;
  score: "good" | "average" | "poor";
}

export async function getMatchingMatrixData(): Promise<{
  setters: Array<{ id: string; name: string; avatar: string | null }>;
  entrepreneurs: Array<{ id: string; name: string; avatar: string | null }>;
  duos: MatchingDuo[];
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  // Fetch all setters (client_b2c)
  const { data: setters } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, matched_entrepreneur_id")
    .eq("role", "client_b2c");

  // Get unique entrepreneur IDs
  const entrepreneurIds = [
    ...new Set(
      (setters || [])
        .map((s) => s.matched_entrepreneur_id)
        .filter(Boolean) as string[],
    ),
  ];

  // Fetch entrepreneurs (client_b2b)
  const { data: entrepreneurs } = entrepreneurIds.length
    ? await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", entrepreneurIds)
    : { data: [] };

  const duos: MatchingDuo[] = [];

  for (const setter of setters || []) {
    if (!setter.matched_entrepreneur_id) continue;

    const entrepreneur = (entrepreneurs || []).find(
      (e) => e.id === setter.matched_entrepreneur_id,
    );
    if (!entrepreneur) continue;

    // Count deals assigned to this setter
    const { count: dealCount } = await supabase
      .from("deals")
      .select("*", { count: "exact", head: true })
      .eq("assigned_to", setter.id);

    // Sum deal values
    const { data: dealValues } = await supabase
      .from("deals")
      .select("value")
      .eq("assigned_to", setter.id);

    const totalRevenue = (dealValues || []).reduce(
      (sum, d) => sum + ((d.value as number) || 0),
      0,
    );

    // Count journal entries (conversations)
    const { count: conversationCount } = await supabase
      .from("daily_journals")
      .select("*", { count: "exact", head: true })
      .eq("user_id", setter.id);

    // Calculate score based on metrics
    let score: "good" | "average" | "poor" = "poor";
    if ((dealCount || 0) >= 5 && totalRevenue >= 5000) {
      score = "good";
    } else if ((dealCount || 0) >= 2 || totalRevenue >= 1000) {
      score = "average";
    }

    duos.push({
      setterId: setter.id,
      setterName: setter.full_name || "Sans nom",
      setterAvatar: setter.avatar_url,
      entrepreneurId: entrepreneur.id,
      entrepreneurName: entrepreneur.full_name || "Sans nom",
      entrepreneurAvatar: entrepreneur.avatar_url,
      dealCount: dealCount || 0,
      totalRevenue,
      conversationCount: conversationCount || 0,
      score,
    });
  }

  return {
    setters: (setters || []).map((s) => ({
      id: s.id,
      name: s.full_name || "Sans nom",
      avatar: s.avatar_url,
    })),
    entrepreneurs: (entrepreneurs || []).map((e) => ({
      id: e.id,
      name: e.full_name || "Sans nom",
      avatar: e.avatar_url,
    })),
    duos,
  };
}
