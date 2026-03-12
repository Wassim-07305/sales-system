import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ApiDocsView } from "./api-docs-view";
import { PageHeader } from "@/components/layout/page-header";

export default async function ApiDocsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "manager"].includes(profile.role)) {
    redirect("/dashboard");
  }

  return (
    <>
      <PageHeader title="API REST" description="Documentation et gestion de l'API publique" />
      <ApiDocsView />
    </>
  );
}
