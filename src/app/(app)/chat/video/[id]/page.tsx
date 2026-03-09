import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getVideoRoom } from "@/lib/actions/communication";
import { VideoRoomView } from "./video-room-view";

export default async function VideoRoomPage({
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

  return <VideoRoomView room={room as any} currentUserId={user.id} />;
}
