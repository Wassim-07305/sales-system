import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getPortalData } from "@/lib/actions/white-label";
import { PortalView } from "./portal-view";

export default async function PortalPage() {
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

  if (profile?.role !== "client_b2b") redirect("/dashboard");

  const data = await getPortalData();

  return <PortalView data={data as any} />;
}
