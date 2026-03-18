import { getLiveSession } from "@/lib/actions/live";
import { LiveRoomView } from "./live-room-view";
import { notFound } from "next/navigation";

export default async function LiveRoomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getLiveSession(id);

  if (!session) {
    notFound();
  }

  return <LiveRoomView session={session} />;
}
