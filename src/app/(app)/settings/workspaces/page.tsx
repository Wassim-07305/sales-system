import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { WorkspacesAdmin } from "./workspaces-admin";

export default async function WorkspacesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "manager"].includes(profile.role))
    redirect("/dashboard");

  // Fetch all B2B entrepreneurs
  const { data: entrepreneurs } = await supabase
    .from("profiles")
    .select(
      "id, full_name, email, company, onboarding_completed, onboarding_step, created_at, updated_at",
    )
    .eq("role", "client_b2b")
    .order("created_at", { ascending: false });

  // Fetch assigned setters for each entrepreneur
  const { data: assignedSetters } = await supabase
    .from("profiles")
    .select("id, full_name, email, matched_entrepreneur_id")
    .eq("role", "client_b2c")
    .not("matched_entrepreneur_id", "is", null);

  // Build a map of entrepreneur_id -> setters[]
  const setterMap: Record<
    string,
    Array<{ id: string; full_name: string | null; email: string }>
  > = {};
  for (const s of assignedSetters || []) {
    const eid = s.matched_entrepreneur_id as string;
    if (!setterMap[eid]) setterMap[eid] = [];
    setterMap[eid].push({
      id: s.id,
      full_name: s.full_name,
      email: s.email,
    });
  }

  // Contract stats per entrepreneur
  const entrepreneurIds = (entrepreneurs || []).map((e) => e.id);
  let contractMap: Record<string, { count: number; signed: number }> = {};
  if (entrepreneurIds.length > 0) {
    try {
      const { data: contracts } = await supabase
        .from("contracts")
        .select("client_id, status")
        .in("client_id", entrepreneurIds);
      for (const c of contracts || []) {
        if (!c.client_id) continue;
        if (!contractMap[c.client_id])
          contractMap[c.client_id] = { count: 0, signed: 0 };
        contractMap[c.client_id].count++;
        if (c.status === "signed") contractMap[c.client_id].signed++;
      }
    } catch {
      contractMap = {};
    }
  }

  const workspaces = (entrepreneurs || []).map((e) => ({
    ...e,
    setters: setterMap[e.id] || [],
    contracts: contractMap[e.id] || { count: 0, signed: 0 },
  }));

  return <WorkspacesAdmin workspaces={workspaces} />;
}
