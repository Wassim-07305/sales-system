import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getVideoRooms } from "@/lib/actions/communication";
import { ReplaysListView } from "./replays-list-view";

export default async function ReplaysPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const rooms = await getVideoRooms();
  // Filtrer uniquement les rooms terminées avec un enregistrement
  const replays = (rooms || []).filter(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (r: any) => r.status === "ended" && r.recording_url,
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <ReplaysListView replays={replays as any} />;
}
