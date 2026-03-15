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

    if (webhookSecret && signature) {
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
      await handleUnipileWebhook(payload);
    } else {
      const payload = await request.json();
      await handleUnipileWebhook(payload);
    }

    return NextResponse.json({ status: "ok" });
  } catch (err) {
    console.error("Unipile webhook error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
