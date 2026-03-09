import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getConversations } from "@/lib/actions/inbox";
import { getProspects } from "@/lib/actions/prospecting";
import { InboxView } from "./inbox-view";

export default async function InboxPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "manager", "setter", "closer"].includes(profile.role)) {
    redirect("/dashboard");
  }

  const conversations = await getConversations();
  const prospects = await getProspects();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <InboxView conversations={conversations as any} prospects={prospects as any} />;
}
