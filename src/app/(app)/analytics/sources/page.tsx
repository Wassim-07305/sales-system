import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getSourceTracking } from "@/lib/actions/analytics-v2";
import { SourcesView } from "./sources-view";

export default async function SourcesPage() {
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

  const data = await getSourceTracking();
  return <SourcesView {...data} />;
}
