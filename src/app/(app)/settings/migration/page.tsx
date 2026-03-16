import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getMigrationHistory } from "@/lib/actions/migration";
import { MigrationView } from "./migration-view";

export default async function MigrationPage() {
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

  const history = await getMigrationHistory();

  return <MigrationView history={history} />;
}
