import { redirect } from "next/navigation";
import { getSession } from "@/lib/actions/roleplay";
import { SessionView } from "./session-view";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function RoleplaySessionPage({ params }: Props) {
  const { id } = await params;
  const session = await getSession(id);
  if (!session) redirect("/roleplay");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <SessionView session={session as any} />;
}
