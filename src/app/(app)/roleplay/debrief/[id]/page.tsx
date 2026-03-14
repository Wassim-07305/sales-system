import { redirect } from "next/navigation";
import { getSession } from "@/lib/actions/roleplay";
import { createClient } from "@/lib/supabase/server";
import { DebriefView } from "./debrief-view";

interface Props { params: Promise<{ id: string }> }

export default async function DebriefPage({ params }: Props) {
  const { id } = await params;
  const session = await getSession(id);
  if (!session) redirect("/roleplay");

  // Fetch past sessions for progression comparison
  const supabase = await createClient();
  const { data: pastSessions } = await supabase
    .from("roleplay_sessions")
    .select("score, ai_feedback, created_at")
    .eq("user_id", (session as Record<string, unknown>).user_id as string)
    .eq("status", "completed")
    .neq("id", id)
    .order("created_at", { ascending: false })
    .limit(10);

  const sessionWithHistory = {
    ...session,
    pastSessions: pastSessions || [],
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <DebriefView session={sessionWithHistory as any} />;
}
