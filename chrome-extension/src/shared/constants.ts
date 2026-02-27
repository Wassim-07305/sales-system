export const LINKEDIN_API_BASE = "https://www.linkedin.com/voyager/api";

export const LINKEDIN_ENDPOINTS = {
  profile: (slug: string) => `${LINKEDIN_API_BASE}/identity/profiles/${slug}`,
  conversations: `${LINKEDIN_API_BASE}/messaging/conversations`,
  conversation: (id: string) => `${LINKEDIN_API_BASE}/messaging/conversations/${id}`,
  conversationEvents: (id: string) => `${LINKEDIN_API_BASE}/messaging/conversations/${id}/events`,
  search: `${LINKEDIN_API_BASE}/search/dash/clusters`,
} as const;

export const SYNC_INTERVAL_MINUTES = 2;
export const PENDING_SEND_POLL_SECONDS = 30;

export const RATE_LIMIT = {
  maxCallsPerHour: 20,
  minDelayMs: 3000,
  maxDelayMs: 8000,
};

export const STORAGE_KEYS = {
  auth: "ss_auth",
  linkedinAuth: "ss_linkedin_auth",
  syncState: "ss_sync_state",
  rateLimitCalls: "ss_rate_calls",
} as const;
