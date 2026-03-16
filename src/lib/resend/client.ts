import { Resend } from "resend";

function getResendClient() {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    throw new Error(
      "RESEND_API_KEY manquant. Ajoutez-le dans .env.local pour activer les emails.",
    );
  }
  return new Resend(key);
}

/** Lazy-initialized Resend client — throws only when actually used without a key. */
export const resend = new Proxy({} as Resend, {
  get(_, prop) {
    const client = getResendClient();
    const value = (client as unknown as Record<string | symbol, unknown>)[prop];
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
});

export const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || "noreply@example.com";
export const FROM_NAME = process.env.RESEND_FROM_NAME || "Sales System";
