"use server";

import { createClient } from "@/lib/supabase/server";
import { stripe, PLANS, type PlanId } from "@/lib/stripe/client";
import { headers } from "next/headers";
import { getApiKey } from "@/lib/api-keys";

/**
 * Create a Stripe Checkout session for a subscription plan.
 * Returns the checkout URL to redirect the user to.
 */
export async function createCheckoutSession(planId: PlanId) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
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
  const {
    data: { user },
  } = await supabase.auth.getUser();
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
  const {
    data: { user },
  } = await supabase.auth.getUser();
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

// ---------------------------------------------------------------------------
// Stripe REST API helpers (use fetch, no stripe npm dependency needed)
// ---------------------------------------------------------------------------

const STRIPE_API = "https://api.stripe.com/v1";

async function getStripeKey(): Promise<string | null> {
  return await getApiKey("STRIPE_SECRET_KEY");
}

async function stripeFetch(path: string, params?: Record<string, string>) {
  const key = await getStripeKey();
  if (!key) return null;

  const url = new URL(`${STRIPE_API}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
  }

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    next: { revalidate: 60 },
  });

  if (!res.ok) return null;
  return res.json();
}

// ---------------------------------------------------------------------------
// Revenue Summary
// ---------------------------------------------------------------------------

export interface StripeRevenueSummary {
  mrr: number;
  revenueThisMonth: number;
  revenueLastMonth: number;
  growthRate: number;
  source: "stripe" | "local";
}

/**
 * Fetch revenue data from Stripe (MRR, monthly totals, growth).
 * Falls back to Supabase deals data if no Stripe key is configured.
 */
export async function getStripeRevenueSummary(): Promise<StripeRevenueSummary> {
  const now = new Date();
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const thisMonthTs = Math.floor(startOfThisMonth.getTime() / 1000);
  const lastMonthTs = Math.floor(startOfLastMonth.getTime() / 1000);
  const nowTs = Math.floor(now.getTime() / 1000);

  // Try Stripe first
  const key = await getStripeKey();
  if (key) {
    try {
      // Charges this month
      const chargesThisMonth = await stripeFetch("/charges", {
        "created[gte]": String(thisMonthTs),
        "created[lte]": String(nowTs),
        status: "succeeded",
        limit: "100",
      });

      // Charges last month
      const chargesLastMonth = await stripeFetch("/charges", {
        "created[gte]": String(lastMonthTs),
        "created[lt]": String(thisMonthTs),
        status: "succeeded",
        limit: "100",
      });

      // Active subscriptions for MRR
      const subscriptions = await stripeFetch("/subscriptions", {
        status: "active",
        limit: "100",
      });

      const revenueThisMonth =
        (chargesThisMonth?.data || []).reduce(
          (sum: number, c: { amount: number }) => sum + c.amount,
          0,
        ) / 100;

      const revenueLastMonth =
        (chargesLastMonth?.data || []).reduce(
          (sum: number, c: { amount: number }) => sum + c.amount,
          0,
        ) / 100;

      // MRR = sum of all active subscription monthly amounts
      const mrr = (subscriptions?.data || []).reduce(
        (
          sum: number,
          sub: {
            items: {
              data: {
                price: {
                  unit_amount: number;
                  recurring: { interval: string; interval_count: number };
                };
              }[];
            };
          },
        ) => {
          const items = sub.items?.data || [];
          return (
            sum +
            items.reduce(
              (
                s: number,
                item: {
                  price: {
                    unit_amount: number;
                    recurring: { interval: string; interval_count: number };
                  };
                },
              ) => {
                const amount = (item.price?.unit_amount || 0) / 100;
                const interval = item.price?.recurring?.interval;
                const intervalCount =
                  item.price?.recurring?.interval_count || 1;
                if (interval === "year")
                  return s + amount / (12 * intervalCount);
                if (interval === "month") return s + amount / intervalCount;
                return s + amount;
              },
              0,
            )
          );
        },
        0,
      );

      const growthRate =
        revenueLastMonth > 0
          ? ((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100
          : 0;

      return {
        mrr: Math.round(mrr * 100) / 100,
        revenueThisMonth: Math.round(revenueThisMonth * 100) / 100,
        revenueLastMonth: Math.round(revenueLastMonth * 100) / 100,
        growthRate: Math.round(growthRate * 10) / 10,
        source: "stripe",
      };
    } catch {
      // Fall through to local fallback
    }
  }

  // Fallback: use Supabase deals data
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      mrr: 0,
      revenueThisMonth: 0,
      revenueLastMonth: 0,
      growthRate: 0,
      source: "local",
    };
  }

  const { data: stages } = await supabase
    .from("pipeline_stages")
    .select("id, name")
    .ilike("name", "%sign%");

  const signedStageIds = (stages || []).map((s) => s.id);

  const { data: deals } = await supabase
    .from("deals")
    .select("value, created_at, stage_id");

  const allDeals = deals || [];
  const signedDeals = allDeals.filter((d) =>
    signedStageIds.includes(d.stage_id),
  );

  const thisMonthISO = startOfThisMonth.toISOString();
  const lastMonthISO = startOfLastMonth.toISOString();

  const revenueThisMonth = signedDeals
    .filter((d) => d.created_at >= thisMonthISO)
    .reduce((s, d) => s + (d.value || 0), 0);

  const revenueLastMonth = signedDeals
    .filter((d) => d.created_at >= lastMonthISO && d.created_at < thisMonthISO)
    .reduce((s, d) => s + (d.value || 0), 0);

  const growthRate =
    revenueLastMonth > 0
      ? ((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100
      : 0;

  return {
    mrr: Math.round(revenueThisMonth),
    revenueThisMonth: Math.round(revenueThisMonth),
    revenueLastMonth: Math.round(revenueLastMonth),
    growthRate: Math.round(growthRate * 10) / 10,
    source: "local",
  };
}

// ---------------------------------------------------------------------------
// Recent Payments
// ---------------------------------------------------------------------------

export interface StripeRecentPayment {
  id: string;
  amount: number;
  currency: string;
  description: string;
  date: string;
  customerEmail: string;
  source: "stripe" | "local";
}

/**
 * Fetch recent successful charges from Stripe.
 * Falls back to local invoices/installments data.
 */
export async function getStripeRecentPayments(
  limit = 10,
): Promise<StripeRecentPayment[]> {
  const key = await getStripeKey();
  if (key) {
    try {
      const data = await stripeFetch("/charges", {
        limit: String(limit),
        status: "succeeded",
      });

      if (data?.data) {
        return (
          data.data as {
            id: string;
            amount: number;
            currency: string;
            description: string | null;
            created: number;
            billing_details?: { email?: string };
          }[]
        ).map((charge) => ({
          id: charge.id,
          amount: charge.amount / 100,
          currency: charge.currency || "eur",
          description: charge.description || "Paiement",
          date: new Date(charge.created * 1000).toISOString(),
          customerEmail: charge.billing_details?.email || "",
          source: "stripe" as const,
        }));
      }
    } catch {
      // Fall through to local fallback
    }
  }

  // Fallback: recent paid installments
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: installments } = await supabase
    .from("payment_installments")
    .select(
      "id, amount, due_date, contract:contracts(id, client:profiles(email))",
    )
    .eq("status", "paid")
    .order("due_date", { ascending: false })
    .limit(limit);

  return (installments || []).map((inst) => ({
    id: inst.id,
    amount: inst.amount || 0,
    currency: "eur",
    description: "Paiement echeance",
    date: inst.due_date || "",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    customerEmail: (inst.contract as any)?.client?.email || "",
    source: "local" as const,
  }));
}

// ---------------------------------------------------------------------------
// Subscription Stats
// ---------------------------------------------------------------------------

export interface StripeSubscriptionStats {
  activeCount: number;
  newThisMonth: number;
  churnedThisMonth: number;
  source: "stripe" | "local";
}

/**
 * Fetch active/new/churned subscription stats from Stripe.
 * Falls back to contract data.
 */
export async function getStripeSubscriptionStats(): Promise<StripeSubscriptionStats> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthTs = Math.floor(startOfMonth.getTime() / 1000);

  const key = await getStripeKey();
  if (key) {
    try {
      // Active subscriptions
      const active = await stripeFetch("/subscriptions", {
        status: "active",
        limit: "1",
      });

      // New subscriptions this month
      const newSubs = await stripeFetch("/subscriptions", {
        status: "active",
        "created[gte]": String(monthTs),
        limit: "100",
      });

      // Canceled this month
      const canceled = await stripeFetch("/subscriptions", {
        status: "canceled",
        "created[gte]": String(monthTs),
        limit: "100",
      });

      return {
        activeCount: active?.data
          ? (active.total_count ?? active.data.length)
          : 0,
        newThisMonth: newSubs?.data?.length || 0,
        churnedThisMonth: canceled?.data?.length || 0,
        source: "stripe",
      };
    } catch {
      // Fall through to local fallback
    }
  }

  // Fallback: use contracts table
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      activeCount: 0,
      newThisMonth: 0,
      churnedThisMonth: 0,
      source: "local",
    };
  }

  const { data: contracts } = await supabase
    .from("contracts")
    .select("id, status, created_at");

  const all = contracts || [];
  const monthISO = startOfMonth.toISOString();

  const activeCount = all.filter(
    (c) => c.status === "signed" || c.status === "active",
  ).length;
  const newThisMonth = all.filter(
    (c) =>
      (c.status === "signed" || c.status === "active") &&
      c.created_at >= monthISO,
  ).length;
  const churnedThisMonth = all.filter(
    (c) => c.status === "cancelled" && c.created_at >= monthISO,
  ).length;

  return { activeCount, newThisMonth, churnedThisMonth, source: "local" };
}

/**
 * Check if Stripe is configured (has a secret key).
 */
export async function isStripeConfigured(): Promise<boolean> {
  return !!(await getStripeKey());
}

/**
 * Get current subscription status for the logged-in user.
 */
export async function getSubscriptionStatus() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
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
    const subscription = (await stripe.subscriptions.retrieve(
      profile.stripe_subscription_id,
    )) as unknown as {
      status: string;
      current_period_end: number;
      cancel_at_period_end: boolean;
    };

    return {
      tier: profile.subscription_tier || "free",
      status: subscription.status,
      currentPeriodEnd: new Date(
        subscription.current_period_end * 1000,
      ).toISOString(),
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
