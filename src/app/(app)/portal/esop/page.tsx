import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getMyEsop } from "@/lib/actions/esop";
import { EsopForm } from "./esop-form";

export default async function PortalEsopPage() {
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

  const { data: esop } = await getMyEsop();

  return <EsopForm esop={esop} />;
}
