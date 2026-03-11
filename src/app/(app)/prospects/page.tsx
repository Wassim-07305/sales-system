import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyProspects, type ProspectRow } from "@/lib/actions/prospects";
import { ProspectsView } from "./prospects-view";

export default async function ProspectsPage() {
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

  const role = profile?.role || "client_b2c";
  const prospects: ProspectRow[] = await getMyProspects();

  return <ProspectsView prospects={prospects} userId={user.id} role={role} />;
}
