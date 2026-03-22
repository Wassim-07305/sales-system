import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getConversations } from "@/lib/actions/inbox";
import { getProspects } from "@/lib/actions/prospecting";
import { getPipelineStages } from "@/lib/actions/crm";
import { InboxView } from "./inbox-view";

export default async function InboxPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (
    !profile ||
    !["admin", "manager", "setter", "closer"].includes(profile.role)
  ) {
    redirect("/dashboard");
  }

  const [conversations, prospects, stages] = await Promise.all([
    getConversations(),
    getProspects(),
    getPipelineStages(),
  ]);

  // Enrich conversations with prospect scores for context badges
  const prospectIds = (conversations as Record<string, unknown>[])
    .map((c) => (c.prospect as Record<string, unknown> | null)?.id as string)
    .filter(Boolean);

  const { data: scores } = await supabase
    .from("prospect_scores")
    .select("prospect_id, total_score, temperature")
    .in("prospect_id", prospectIds.length > 0 ? prospectIds : ["__none__"]);

  const scoresMap: Record<string, { total_score: number; temperature: string }> = {};
  for (const s of scores || []) {
    scoresMap[s.prospect_id as string] = {
      total_score: (s.total_score as number) ?? 0,
      temperature: (s.temperature as string) ?? "cold",
    };
  }

  const enrichedConversations = (conversations as Record<string, unknown>[]).map((c) => {
    const prospect = c.prospect as Record<string, unknown> | null;
    const prospectId = prospect?.id as string | undefined;
    return {
      ...c,
      prospect_score: prospectId ? scoresMap[prospectId] ?? null : null,
    };
  });

  return (
    <InboxView
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      conversations={enrichedConversations as any}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      prospects={prospects as any}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      stages={stages as any}
    />
  );
}
