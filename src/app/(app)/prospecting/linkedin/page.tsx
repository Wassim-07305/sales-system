import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getProspects } from "@/lib/actions/prospecting";
import { LinkedinView } from "./linkedin-view";

export default async function LinkedinPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const prospects = await getProspects({ platform: "linkedin" });

  // Fetch LinkedIn sync status
  const { data: syncData } = await supabase
    .from("linkedin_sync")
    .select("*")
    .eq("user_id", user.id)
    .single();

  const syncStatus = syncData
    ? {
        connected: syncData.sync_status === "active",
        lastSyncAt: syncData.last_sync_at as string | null,
        conversationsSynced: (syncData.conversations_synced as number) || 0,
        prospectsSynced: (syncData.prospects_synced as number) || 0,
      }
    : null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <LinkedinView prospects={prospects as any} syncStatus={syncStatus} />;
}
