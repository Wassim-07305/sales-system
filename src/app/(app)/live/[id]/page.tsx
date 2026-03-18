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

  return (
    <div className="-m-4 md:-m-8 h-[calc(100vh-3.5rem)] flex">
      <LiveRoomView session={session} />
    </div>
  );
}
