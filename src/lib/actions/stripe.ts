"use server";

import { createClient } from "@/lib/supabase/server";
import { stripe, PLANS, type PlanId } from "@/lib/stripe/client";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

/**
 * Create a Stripe Checkout session for a subscription plan.
 * Returns the checkout URL to redirect the user to.
 */
export async function createCheckoutSession(planId: PlanId) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifie");

  const plan = PLANS[planId];
  if (!plan || !plan.priceId) {
    throw new Error("Plan invalide ou gratuit");
  }

  // Get or create Stripe customer
  const { data: profile } = await supabase
    .from("profiles")
    .select("email, full_name, stripe_customer_id")
    .eq("id", user.id)
    .single();

  let customerId = profile?.stripe_customer_id;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: profile?.email || user.email || "",
      name: profile?.full_name || undefined,
      metadata: { supabase_user_id: user.id },
    });
    customerId = customer.id;

    await supabase
      .from("profiles")
      .update({ stripe_customer_id: customerId })
      .eq("id", user.id);
  }

  const headersList = await headers();
  const origin = headersList.get("origin") || "http://localhost:3001";

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: plan.priceId, quantity: 1 }],
    success_url: `${origin}/settings/subscription?success=true`,
    cancel_url: `${origin}/settings/subscription?canceled=true`,
    metadata: {
      supabase_user_id: user.id,
      plan_id: planId,
    },
  });

  return { url: session.url };
}

/**
 * Create a Stripe portal session so users can manage billing.
 */
export async function createPortalSession() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifie");

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single();

  if (!profile?.stripe_customer_id) {
    throw new Error("Aucun abonnement actif");
  }

  const headersList = await headers();
  const origin = headersList.get("origin") || "http://localhost:3001";

  const session = await stripe.billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: `${origin}/settings/subscription`,
  });

  return { url: session.url };
}

/**
 * Create a one-time payment checkout (for contract installments).
 */
export async function createPaymentCheckout(installmentId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifie");

  const { data: installment } = await supabase
    .from("payment_installments")
    .select("id, amount, contract_id")
    .eq("id", installmentId)
    .single();

  if (!installment) throw new Error("Echeance introuvable");

  // Get or create customer
  const { data: profile } = await supabase
    .from("profiles")
    .select("email, full_name, stripe_customer_id")
    .eq("id", user.id)
    .single();

  let customerId = profile?.stripe_customer_id;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: profile?.email || user.email || "",
      name: profile?.full_name || undefined,
      metadata: { supabase_user_id: user.id },
    });
    customerId = customer.id;

    await supabase
      .from("profiles")
      .update({ stripe_customer_id: customerId })
      .eq("id", user.id);
  }

  const headersList = await headers();
  const origin = headersList.get("origin") || "http://localhost:3001";

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "eur",
          product_data: {
            name: `Echeance contrat #${installment.contract_id.slice(0, 8)}`,
          },
          unit_amount: Math.round(installment.amount * 100),
        },
        quantity: 1,
      },
    ],
    success_url: `${origin}/contracts/payments?success=true`,
    cancel_url: `${origin}/contracts/payments?canceled=true`,
    metadata: {
      supabase_user_id: user.id,
      installment_id: installmentId,
      type: "installment",
    },
  });

  return { url: session.url };
}

/**
 * Get current subscription status for the logged-in user.
 */
export async function getSubscriptionStatus() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_tier, stripe_customer_id, stripe_subscription_id")
    .eq("id", user.id)
    .single();

  if (!profile?.stripe_subscription_id) {
    return {
      tier: profile?.subscription_tier || "free",
      status: "active",
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    };
  }

  try {
    const subscription = await stripe.subscriptions.retrieve(
      profile.stripe_subscription_id
    ) as unknown as { status: string; current_period_end: number; cancel_at_period_end: boolean };

    return {
      tier: profile.subscription_tier || "free",
      status: subscription.status,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    };
  } catch {
    return {
      tier: profile?.subscription_tier || "free",
      status: "active",
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    };
  }
}
