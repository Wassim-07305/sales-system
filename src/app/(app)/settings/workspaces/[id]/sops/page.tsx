import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getClientSops } from "@/lib/actions/sops";
import { SopsView } from "@/app/(app)/portal/sops/sops-view";

export default async function WorkspaceSopsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: clientId } = await params;
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

  if (!profile || !["admin", "manager"].includes(profile.role)) {
    redirect("/dashboard");
  }

  // Verify the client exists and is B2B
  const { data: clientProfile } = await supabase
    .from("profiles")
    .select("full_name, company, role")
    .eq("id", clientId)
    .single();

  if (!clientProfile || clientProfile.role !== "client_b2b") {
    redirect("/settings/workspaces");
  }

  const { data: sopData } = await getClientSops(clientId);

  return (
    <div>
      <div className="mb-4 text-sm text-muted-foreground">
        Workspace de{" "}
        <span className="text-foreground font-medium">
          {clientProfile.full_name || clientProfile.company || "Entrepreneur"}
        </span>
      </div>
      <SopsView sopData={sopData} clientId={clientId} readOnly={false} />
    </div>
  );
}
