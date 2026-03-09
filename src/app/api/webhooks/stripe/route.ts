import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/client";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: NextRequest) {
  const supabaseAdmin = getSupabaseAdmin();
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.supabase_user_id;

      if (session.mode === "subscription" && userId) {
        const planId = session.metadata?.plan_id || "pro";
        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id;

        await supabaseAdmin
          .from("profiles")
          .update({
            subscription_tier: planId,
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: subscriptionId,
          })
          .eq("id", userId);

        // Notify user
        await supabaseAdmin.from("notifications").insert({
          user_id: userId,
          title: "Abonnement active !",
          body: `Ton plan ${planId === "pro" ? "Pro" : "Enterprise"} est maintenant actif.`,
          type: "system",
          link: "/settings/subscription",
          read: false,
        });
      }

      if (session.mode === "payment" && session.metadata?.installment_id) {
        // Mark installment as paid
        await supabaseAdmin
          .from("payment_installments")
          .update({
            status: "paid",
            paid_at: new Date().toISOString(),
            stripe_payment_id: session.payment_intent as string,
          })
          .eq("id", session.metadata.installment_id);
      }
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId =
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer.id;

      // Find user by customer ID
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("stripe_customer_id", customerId)
        .single();

      if (profile) {
        if (subscription.status === "active") {
          // Determine plan from price
          const priceId = subscription.items.data[0]?.price?.id;
          let tier = "pro";
          if (priceId === process.env.STRIPE_ENTERPRISE_PRICE_ID) {
            tier = "enterprise";
          }

          await supabaseAdmin
            .from("profiles")
            .update({
              subscription_tier: tier,
              stripe_subscription_id: subscription.id,
            })
            .eq("id", profile.id);
        }
      }
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId =
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer.id;

      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("stripe_customer_id", customerId)
        .single();

      if (profile) {
        await supabaseAdmin
          .from("profiles")
          .update({
            subscription_tier: "free",
            stripe_subscription_id: null,
          })
          .eq("id", profile.id);

        await supabaseAdmin.from("notifications").insert({
          user_id: profile.id,
          title: "Abonnement annule",
          body: "Ton abonnement a ete annule. Tu es repasse au plan Free.",
          type: "system",
          link: "/settings/subscription",
          read: false,
        });
      }
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId =
        typeof invoice.customer === "string"
          ? invoice.customer
          : (invoice.customer as Stripe.Customer)?.id;

      if (customerId) {
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .single();

        if (profile) {
          await supabaseAdmin.from("notifications").insert({
            user_id: profile.id,
            title: "Echec de paiement",
            body: "Le paiement de ton abonnement a echoue. Mets a jour ton moyen de paiement.",
            type: "system",
            link: "/settings/subscription",
            read: false,
          });
        }
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
