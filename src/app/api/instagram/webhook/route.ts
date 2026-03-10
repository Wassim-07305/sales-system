import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Vérification du webhook (challenge Meta)
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const verifyToken = process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN;

  if (mode === "subscribe" && token === verifyToken) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

// Réception des messages Instagram entrants
export async function POST(request: NextRequest) {
  const supabaseAdmin = getSupabaseAdmin();

  // Vérifier la signature Meta
  const appSecret = process.env.META_APP_SECRET;
  if (appSecret) {
    const signature = request.headers.get("x-hub-signature-256");
    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 401 });
    }

    const body = await request.text();
    const { createHmac } = await import("crypto");
    const expectedSignature =
      "sha256=" + createHmac("sha256", appSecret).update(body).digest("hex");

    if (signature !== expectedSignature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const payload = JSON.parse(body);
    await processInstagramWebhook(supabaseAdmin, payload);
  } else {
    const payload = await request.json();
    await processInstagramWebhook(supabaseAdmin, payload);
  }

  return NextResponse.json({ received: true });
}

async function processInstagramWebhook(
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
  payload: Record<string, unknown>
) {
  const entries = (payload.entry as Array<Record<string, unknown>>) || [];

  for (const entry of entries) {
    const messaging =
      (entry.messaging as Array<Record<string, unknown>>) || [];

    for (const event of messaging) {
      const senderId = (event.sender as Record<string, unknown>)?.id as string;
      const recipientId = (event.recipient as Record<string, unknown>)?.id as string;
      const message = event.message as Record<string, unknown> | undefined;
      const timestamp = event.timestamp as number;

      if (!message || !senderId) continue;

      // Déterminer si c'est un message entrant (sender !== notre compte)
      const instagramAccountId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
      const isInbound = senderId !== instagramAccountId;

      if (!isInbound) continue; // On ne stocke que les messages entrants via webhook

      const content = (message.text as string) || "[Media]";
      const igMessageId = message.mid as string;

      // Chercher un prospect existant par Instagram ID
      const { data: existingProspect } = await supabaseAdmin
        .from("prospects")
        .select("id, user_id")
        .eq("instagram_id", senderId)
        .single();

      let prospectId: string | null = null;
      let userId: string | null = null;

      if (existingProspect) {
        prospectId = existingProspect.id;
        userId = existingProspect.user_id;
      } else {
        // Trouver l'admin/manager principal pour attribuer le prospect
        const { data: admin } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .in("role", ["admin", "manager"])
          .limit(1)
          .single();

        userId = admin?.id || null;

        if (userId) {
          const { data: newProspect } = await supabaseAdmin
            .from("prospects")
            .insert({
              user_id: userId,
              name: `Instagram ${senderId}`,
              instagram_id: senderId,
              platform: "instagram",
              status: "new",
            })
            .select("id")
            .single();

          prospectId = newProspect?.id || null;
        }
      }

      if (!userId) continue;

      // Stocker le message dans la table inbox_messages
      await supabaseAdmin.from("inbox_messages").insert({
        user_id: userId,
        prospect_id: prospectId,
        channel: "instagram",
        direction: "inbound",
        content,
        external_id: igMessageId,
        created_at: timestamp
          ? new Date(timestamp).toISOString()
          : new Date().toISOString(),
      });

      // Notification
      await supabaseAdmin.from("notifications").insert({
        user_id: userId,
        title: "Nouveau DM Instagram",
        body: content.length > 100 ? content.substring(0, 100) + "..." : content,
        type: "instagram",
        link: "/inbox",
        read: false,
      });
    }
  }
}
