import { redirect } from "next/navigation";
import { getSession } from "@/lib/actions/roleplay";
import { DebriefView } from "./debrief-view";

interface Props { params: Promise<{ id: string }> }

export default async function DebriefPage({ params }: Props) {
  const { id } = await params;
  const session = await getSession(id);
  if (!session) redirect("/roleplay");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <DebriefView session={session as any} />;
}
