import { UnipileClient } from "unipile-node-sdk";

let _client: UnipileClient | null = null;

/**
 * Get the singleton Unipile client.
 * Returns null if credentials are not configured.
 */
export function getUnipileClient(): UnipileClient | null {
  const dsn = process.env.UNIPILE_DSN;
  const accessToken = process.env.UNIPILE_API_KEY;

  if (!dsn || !accessToken) return null;

  if (!_client) {
    _client = new UnipileClient(dsn, accessToken);
  }

  return _client;
}

/**
 * Check if Unipile is configured and available.
 */
export function isUnipileConfigured(): boolean {
  return !!(process.env.UNIPILE_DSN && process.env.UNIPILE_API_KEY);
}

/**
 * Map Unipile provider names to our internal channel names.
 */
export const UNIPILE_PROVIDER_MAP: Record<string, string> = {
  LINKEDIN: "linkedin",
  INSTAGRAM: "instagram",
  WHATSAPP: "whatsapp",
  TELEGRAM: "telegram",
  SLACK: "slack",
  MAIL: "email",
  GOOGLE: "google_calendar",
  OUTLOOK: "outlook_calendar",
  MESSENGER: "messenger",
  TWITTER: "twitter",
};

/**
 * Map our internal channel names to Unipile provider names.
 */
export const CHANNEL_TO_PROVIDER: Record<string, string> = {
  linkedin: "LINKEDIN",
  instagram: "INSTAGRAM",
  whatsapp: "WHATSAPP",
  telegram: "TELEGRAM",
  slack: "SLACK",
  email: "MAIL",
};
