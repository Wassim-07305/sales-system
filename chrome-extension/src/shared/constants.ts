export const LINKEDIN_API_BASE = "https://www.linkedin.com/voyager/api";

export const LINKEDIN_GRAPHQL_BASE = `${LINKEDIN_API_BASE}/voyagerMessagingGraphQL/graphql`;

/** Encode a LinkedIn URN for use in GraphQL variables — encodeURIComponent misses ( ) */
function encodeUrn(urn: string): string {
  return encodeURIComponent(urn).replace(/\(/g, "%28").replace(/\)/g, "%29");
}

export const LINKEDIN_QUERY_IDS = {
  conversations: "messengerConversations.0d5e6781bbee71c3e51c8843c6519f48",
  conversationsPaginated: "messengerConversations.9501074288a12f3ae9e3c7ea243bccbf",
  messages: "messengerMessages.5846eeb71c981f11e0134cb6626cc314",
  messagesPaginated: "messengerMessages.d8ea76885a52fd5dc5c317078ab7c977",
} as const;

export const LINKEDIN_ENDPOINTS = {
  // Profile (REST — still works)
  profile: (slug: string) => `${LINKEDIN_API_BASE}/identity/profiles/${slug}`,
  me: `${LINKEDIN_API_BASE}/me`,

  // GraphQL messaging — conversations
  graphqlConversations: (mailboxUrn: string) =>
    `${LINKEDIN_GRAPHQL_BASE}?queryId=${LINKEDIN_QUERY_IDS.conversations}&variables=(mailboxUrn:${encodeUrn(mailboxUrn)})`,

  graphqlConversationsPaginated: (mailboxUrn: string, count: number, cursor?: string) => {
    const base = `(query:(predicateUnions:List((conversationCategoryPredicate:(category:INBOX)))),count:${count},mailboxUrn:${encodeUrn(mailboxUrn)}`;
    const pagination = cursor ? `,nextCursor:${encodeUrn(cursor)}` : "";
    return `${LINKEDIN_GRAPHQL_BASE}?queryId=${LINKEDIN_QUERY_IDS.conversationsPaginated}&variables=${base}${pagination})`;
  },

  // GraphQL messaging — messages
  graphqlMessages: (conversationUrn: string) =>
    `${LINKEDIN_GRAPHQL_BASE}?queryId=${LINKEDIN_QUERY_IDS.messages}&variables=(conversationUrn:${encodeUrn(conversationUrn)})`,

  // REST — sending messages (old endpoint, may still work)
  conversationEvents: (threadId: string) =>
    `${LINKEDIN_API_BASE}/messaging/conversations/${threadId}/events`,

  // REST — sending via new dash API
  sendMessage: `${LINKEDIN_API_BASE}/voyagerMessagingDashMessengerMessages?action=createMessage`,

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
