import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getVideoRooms } from "@/lib/actions/communication";
import { VideoListView } from "./video-list-view";

export default async function VideoPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const rooms = await getVideoRooms();

  return <VideoListView rooms={rooms as any} />;
}
