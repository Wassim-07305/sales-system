import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getBroadcasts } from "@/lib/actions/communication";
import { BroadcastView } from "./broadcast-view";

export default async function BroadcastPage() {
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

  const broadcasts = await getBroadcasts();

  return <BroadcastView broadcasts={broadcasts as any} />;
}
