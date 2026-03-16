import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getUserSessions } from "@/lib/actions/roleplay";
import { SpectateView } from "./spectate-view";

export default async function SpectatePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const sessions = await getUserSessions(); // no userId = all sessions
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <SpectateView sessions={sessions as any} />;
}
