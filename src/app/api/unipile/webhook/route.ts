import { NextRequest, NextResponse } from "next/server";
import { handleUnipileWebhook } from "@/lib/actions/unipile";

/**
 * Unipile unified webhook endpoint.
 * Receives events for all connected accounts (LinkedIn, Instagram, WhatsApp, etc.)
 * Configure this URL in Unipile dashboard: https://your-domain.com/api/unipile/webhook
 */

// Verification endpoint (GET)
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const challenge = searchParams.get("challenge");
  const token = searchParams.get("verify_token");

  const expectedToken = process.env.UNIPILE_WEBHOOK_VERIFY_TOKEN;

  if (token && expectedToken && token === expectedToken) {
    return new NextResponse(challenge || "OK", { status: 200 });
  }

  return NextResponse.json({ status: "Unipile webhook active" });
}

// Event handler (POST)
export async function POST(request: NextRequest) {
  try {
    // Verify webhook signature if configured
    const signature = request.headers.get("x-unipile-signature");
    const webhookSecret = process.env.UNIPILE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error(
        "UNIPILE_WEBHOOK_SECRET not configured — rejecting webhook",
      );
      return NextResponse.json(
        { error: "Webhook not configured" },
        { status: 500 },
      );
    }

    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 401 });
    }

    const body = await request.text();

    // Verify HMAC signature
    const crypto = await import("crypto");
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(body)
      .digest("hex");

    if (signature !== expectedSignature) {
      console.error("Unipile webhook signature mismatch");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const payload = JSON.parse(body);

    // Idempotency: skip duplicate events based on event_id
    const eventId = payload?.event_id ?? payload?.id;
    if (eventId) {
      const store = globalThis as Record<string, unknown>;
      const processed = store.__webhookProcessed as Set<string> | undefined;
      const cacheKey = `wh-${eventId}`;
      if (processed?.has(cacheKey)) {
        return NextResponse.json({ status: "duplicate_skipped" });
      }
      if (!processed) {
        store.__webhookProcessed = new Set<string>();
      }
      (store.__webhookProcessed as Set<string>).add(cacheKey);
      // Cap at 10k entries to prevent unbounded memory
      if ((store.__webhookProcessed as Set<string>).size > 10000) {
        store.__webhookProcessed = new Set<string>();
      }
    }

    await handleUnipileWebhook(payload);

    return NextResponse.json({ status: "ok" });
  } catch (err) {
    console.error("Unipile webhook error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
