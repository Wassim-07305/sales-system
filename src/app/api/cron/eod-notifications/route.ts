import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const CRON_SECRET = process.env.CRON_SECRET;

/**
 * EOD notification cron — triggered daily at 19h (Vercel Cron).
 * For each setter who submitted a journal today, notify their matched entrepreneur.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    return NextResponse.json(
      { error: "Service role key not configured" },
      { status: 500 },
    );
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
  );

  const today = new Date().toISOString().split("T")[0];

  // Get today's journals
  const { data: journals } = await supabase
    .from("daily_journals")
    .select(
      "user_id, dms_sent, replies_received, calls_booked, deals_closed, mood",
    )
    .gte("created_at", `${today}T00:00:00`)
    .lte("created_at", `${today}T23:59:59`);

  if (!journals || journals.length === 0) {
    return NextResponse.json({ message: "No journals today", notified: 0 });
  }

  let notified = 0;

  for (const journal of journals) {
    // Find the entrepreneur matched to this setter
    const { data: setter } = await supabase
      .from("profiles")
      .select("full_name, matched_entrepreneur_id")
      .eq("id", journal.user_id)
      .single();

    if (!setter?.matched_entrepreneur_id) continue;

    // Create notification for the entrepreneur
    const title = `EOD — ${setter.full_name || "Votre setter"}`;
    const body = `DMs: ${journal.dms_sent || 0} | Réponses: ${journal.replies_received || 0} | Appels bookés: ${journal.calls_booked || 0} | Deals: ${journal.deals_closed || 0}`;

    await supabase.from("notifications").insert({
      user_id: setter.matched_entrepreneur_id,
      title,
      body,
      type: "eod_report",
      link: "/portal",
      read: false,
    });

    notified++;
  }

  return NextResponse.json({
    message: `EOD notifications sent`,
    journals: journals.length,
    notified,
  });
}
