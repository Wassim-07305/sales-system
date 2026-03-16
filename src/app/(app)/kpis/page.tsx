import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { KpisView } from "./kpis-view";
import { getSimulatorInputs } from "@/lib/actions/simulator";

export default async function KpisPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profileRole } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (
    !profileRole ||
    !["client_b2b", "client_b2c"].includes(profileRole.role)
  ) {
    redirect("/dashboard");
  }

  // Get KPIs for this client
  const { data: kpis } = await supabase
    .from("client_kpis")
    .select("*")
    .eq("client_id", user.id)
    .order("date", { ascending: true });

  // Check for pending NPS
  const { data: pendingNps } = await supabase
    .from("nps_surveys")
    .select("*")
    .eq("client_id", user.id)
    .is("responded_at", null)
    .order("created_at", { ascending: false })
    .limit(1);

  // Get saved simulator inputs
  const savedSimulatorInputs = await getSimulatorInputs();

  return (
    <KpisView
      kpis={kpis || []}
      pendingNps={pendingNps?.[0] || null}
      savedSimulatorInputs={savedSimulatorInputs}
    />
  );
}
