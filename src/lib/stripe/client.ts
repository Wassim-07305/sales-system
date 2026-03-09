import Stripe from "stripe";

function getStripeClient() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY manquant. Ajoutez-le dans .env.local pour activer les paiements."
    );
  }
  return new Stripe(key, { typescript: true });
}

/** Lazy-initialized Stripe client — throws only when actually used without a key. */
export const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    const client = getStripeClient();
    const value = (client as unknown as Record<string | symbol, unknown>)[prop];
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
});

export const PLANS = {
  free: {
    name: "Free",
    priceId: null,
  },
  pro: {
    name: "Pro",
    priceId: process.env.STRIPE_PRO_PRICE_ID || "",
  },
  enterprise: {
    name: "Enterprise",
    priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID || "",
  },
} as const;

export type PlanId = keyof typeof PLANS;
