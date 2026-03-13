import Stripe from "stripe";
import { getApiKey } from "@/lib/api-keys";

function getStripeClientSync() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY manquant. Ajoutez-le dans .env.local ou dans les paramètres pour activer les paiements."
    );
  }
  return new Stripe(key, { typescript: true });
}

/**
 * Async Stripe client getter — resolves key via getApiKey (env var + org_settings).
 * Use this in server actions where you can await.
 */
export async function getStripeClient(): Promise<Stripe> {
  const key = await getApiKey("STRIPE_SECRET_KEY");
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY manquant. Ajoutez-le dans .env.local ou dans les paramètres pour activer les paiements."
    );
  }
  return new Stripe(key, { typescript: true });
}

/** Lazy-initialized Stripe client (sync, env var only) — throws only when actually used without a key. */
export const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    const client = getStripeClientSync();
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
