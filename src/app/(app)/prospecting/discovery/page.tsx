import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DiscoveryView } from "./discovery-view";

export default async function DiscoveryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return <DiscoveryView />;
}
