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

  const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;

  if (mode === "subscribe" && token === verifyToken) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

// Réception des messages WhatsApp entrants
export async function POST(request: NextRequest) {
  const supabaseAdmin = getSupabaseAdmin();

  // Vérifier la signature Meta (si META_APP_SECRET est configuré)
  const appSecret = process.env.META_APP_SECRET;
  if (appSecret) {
    const signature = request.headers.get("x-hub-signature-256");
    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 401 });
    }

    // En production, vérifier le HMAC SHA-256
    const body = await request.text();
    const { createHmac } = await import("crypto");
    const expectedSignature =
      "sha256=" + createHmac("sha256", appSecret).update(body).digest("hex");

    if (signature !== expectedSignature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // Parser le body manuellement car on l'a déjà lu
    const payload = JSON.parse(body);
    await processWebhookPayload(supabaseAdmin, payload);
  } else {
    // Mode développement : pas de vérification de signature
    const payload = await request.json();
    await processWebhookPayload(supabaseAdmin, payload);
  }

  return NextResponse.json({ received: true });
}

async function processWebhookPayload(
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
  payload: Record<string, unknown>
) {
  const entries = (payload.entry as Array<Record<string, unknown>>) || [];

  for (const entry of entries) {
    const changes = (entry.changes as Array<Record<string, unknown>>) || [];

    for (const change of changes) {
      if (change.field !== "messages") continue;

      const value = change.value as Record<string, unknown>;
      const messages =
        (value.messages as Array<Record<string, unknown>>) || [];
      const contacts =
        (value.contacts as Array<Record<string, unknown>>) || [];
      const metadata = value.metadata as Record<string, unknown>;
      const phoneNumberId = metadata?.phone_number_id as string;

      // Trouver la connexion WhatsApp correspondante
      const { data: connection } = await supabaseAdmin
        .from("whatsapp_connections")
        .select("id, user_id")
        .eq("phone_number_id", phoneNumberId)
        .eq("status", "connected")
        .single();

      if (!connection) {
        // Essayer de trouver par téléphone si phone_number_id n'est pas stocké
        continue;
      }

      for (const message of messages) {
        const from = message.from as string;
        const msgType = message.type as string;
        const timestamp = message.timestamp as string;

        // Extraire le contenu selon le type
        let content = "";
        if (msgType === "text") {
          const text = message.text as Record<string, unknown>;
          content = (text?.body as string) || "";
        } else if (msgType === "image" || msgType === "video" || msgType === "audio") {
          content = `[${msgType}]`;
        } else if (msgType === "document") {
          const doc = message.document as Record<string, unknown>;
          content = `[Document: ${doc?.filename || "fichier"}]`;
        } else {
          content = `[${msgType}]`;
        }

        // Trouver le contact (nom)
        const contact = contacts.find(
          (c) => (c.wa_id as string) === from
        );
        const contactName = contact
          ? ((contact.profile as Record<string, unknown>)?.name as string) || from
          : from;

        // Chercher un prospect existant ou en créer un
        let prospectId: string | null = null;
        const { data: existingProspect } = await supabaseAdmin
          .from("prospects")
          .select("id")
          .eq("phone", from)
          .eq("user_id", connection.user_id)
          .single();

        if (existingProspect) {
          prospectId = existingProspect.id;
        } else {
          // Créer un nouveau prospect depuis WhatsApp
          const { data: newProspect } = await supabaseAdmin
            .from("prospects")
            .insert({
              user_id: connection.user_id,
              name: contactName,
              phone: from,
              platform: "whatsapp",
              status: "new",
            })
            .select("id")
            .single();

          prospectId = newProspect?.id || null;
        }

        // Insérer le message entrant
        await supabaseAdmin.from("whatsapp_messages").insert({
          connection_id: connection.id,
          prospect_id: prospectId,
          direction: "inbound",
          content,
          status: "delivered",
          wa_message_id: message.id as string,
          created_at: timestamp
            ? new Date(parseInt(timestamp) * 1000).toISOString()
            : new Date().toISOString(),
        });

        // Créer une notification pour l'utilisateur
        await supabaseAdmin.from("notifications").insert({
          user_id: connection.user_id,
          title: `Message WhatsApp de ${contactName}`,
          body: content.length > 100 ? content.substring(0, 100) + "..." : content,
          type: "whatsapp",
          link: "/whatsapp",
          read: false,
        });
      }

      // Traiter les statuts de messages (delivered, read, etc.)
      const statuses =
        (value.statuses as Array<Record<string, unknown>>) || [];
      for (const status of statuses) {
        const waMessageId = status.id as string;
        const statusValue = status.status as string;

        if (waMessageId && statusValue) {
          await supabaseAdmin
            .from("whatsapp_messages")
            .update({ status: statusValue })
            .eq("wa_message_id", waMessageId);
        }
      }
    }
  }
}
