import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getPermissions } from "@/lib/actions/white-label";
import { PermissionsView } from "./permissions-view";

export default async function PermissionsPage() {
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

  if (profile?.role !== "admin") redirect("/dashboard");

  const permissions = await getPermissions();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <PermissionsView permissions={permissions as any} />;
}
