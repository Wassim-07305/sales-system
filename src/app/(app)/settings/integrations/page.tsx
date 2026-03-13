import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { IntegrationsView } from "./integrations-view";
import { PageHeader } from "@/components/layout/page-header";
import { getIntegrationStatus } from "@/lib/api-keys";

export default async function IntegrationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    redirect("/dashboard");
  }

  const status = await getIntegrationStatus();

  return (
    <>
      <PageHeader
        title="Intégrations"
        description="Configurez les clés API et connexions aux services externes"
      />
      <IntegrationsView initialStatus={status} />
    </>
  );
}
