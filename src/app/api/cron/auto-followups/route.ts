import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { notify } from "@/lib/actions/notifications";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();
  const now = new Date();
  let followupsSent = 0;

  // Prospects sans reponse depuis 2 jours
  const twoDaysAgo = new Date(
    now.getTime() - 2 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const fiveDaysAgo = new Date(
    now.getTime() - 5 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { data: staleProspects } = await supabase
    .from("prospects")
    .select("id, name, status, owner_id, updated_at")
    .eq("status", "contacted")
    .lt("updated_at", twoDaysAgo)
    .gt("updated_at", fiveDaysAgo)
    .limit(50);

  for (const prospect of staleProspects || []) {
    if (prospect.owner_id) {
      await notify(
        prospect.owner_id,
        "Relance nécessaire",
        `${prospect.name} n'a pas répondu depuis 2 jours. Pensez à relancer !`,
        {
          link: `/prospecting/${prospect.id}`,
          type: "followup_reminder",
        },
      );
      followupsSent++;
    }
  }

  // Prospects sans reponse depuis 5 jours — plus urgent
  const { data: veryStaleProspects } = await supabase
    .from("prospects")
    .select("id, name, status, owner_id, updated_at")
    .eq("status", "contacted")
    .lt("updated_at", fiveDaysAgo)
    .limit(50);

  for (const prospect of veryStaleProspects || []) {
    if (prospect.owner_id) {
      await notify(
        prospect.owner_id,
        "Relance urgente",
        `${prospect.name} n'a pas répondu depuis 5+ jours. Dernière chance avant archivage.`,
        {
          link: `/prospecting/${prospect.id}`,
          type: "followup_urgent",
        },
      );
      followupsSent++;
    }
  }

  return NextResponse.json({ success: true, followupsSent });
}
