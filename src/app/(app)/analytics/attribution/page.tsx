import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getMultiTouchAttribution } from "@/lib/actions/analytics-v2";
import { AttributionView } from "./attribution-view";

export default async function AttributionPage() {
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

  const data = await getMultiTouchAttribution();

  return <AttributionView data={data as any} />;
}
