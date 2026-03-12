import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getWhiteLabelConfig } from "@/lib/actions/white-label";
import { WhiteLabelView } from "./white-label-view";

export default async function WhiteLabelPage() {
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

  const config = await getWhiteLabelConfig();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <WhiteLabelView config={config as any} />;
}
