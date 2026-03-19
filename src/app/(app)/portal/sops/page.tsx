import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getClientSops } from "@/lib/actions/sops";
import { SopsView } from "./sops-view";

export default async function PortalSopsPage() {
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

  const { data: sopData } = await getClientSops(user.id);

  return (
    <SopsView
      sopData={sopData}
      clientId={user.id}
      readOnly
    />
  );
}
