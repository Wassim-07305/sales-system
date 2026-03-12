import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getVideoRoom, getRecording } from "@/lib/actions/communication";
import { ReplayView } from "./replay-view";

export default async function ReplayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const room = await getVideoRoom(id);
  if (!room) redirect("/chat/video");

  const recording = await getRecording(id);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <ReplayView room={room as any} recording={recording as any} />;
}
