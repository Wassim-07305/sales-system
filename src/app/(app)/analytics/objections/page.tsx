import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getRecurringObjections } from "@/lib/actions/analytics-v2";
import { ObjectionsView } from "./objections-view";

export default async function ObjectionsPage() {
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

  if (
    !profile ||
    !["admin", "manager", "setter", "closer"].includes(profile.role)
  ) {
    redirect("/dashboard");
  }

  const data = await getRecurringObjections();
  return <ObjectionsView {...data} />;
}
