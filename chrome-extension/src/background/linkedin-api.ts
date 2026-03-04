import { getLinkedInAuth, setLinkedInAuth, canMakeApiCall, recordApiCall, randomDelay } from "../shared/storage";
import { LINKEDIN_ENDPOINTS } from "../shared/constants";
import type { LinkedInProfile, LinkedInConversation, LinkedInMessage } from "../shared/types";

/**
 * Ensure content script is injected in the LinkedIn tab.
 * After extension reload, existing tabs lose the content script.
 */
async function ensureContentScript(tabId: number): Promise<boolean> {
  try {
    const pong = await new Promise<boolean>((resolve) => {
      chrome.tabs.sendMessage(tabId, { action: "get_captured_headers" }, (response) => {
        if (chrome.runtime.lastError) {
          resolve(false);
          return;
        }
        resolve(!!response);
      });
    });
    if (pong) return true;

    console.log("[LI] Content script not found, injecting...");
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["content/index.js"],
    });
    await chrome.scripting.insertCSS({
      target: { tabId },
      files: ["content/styles.css"],
    });
    await new Promise((r) => setTimeout(r, 500));
    console.log("[LI] Content script injected successfully");
    return true;
  } catch (err) {
    console.error("[LI] Failed to inject content script:", err);
    return false;
  }
}

/**
 * Find a LinkedIn tab and send a proxy_fetch message through the content script.
 * The content script runs in LinkedIn's page context where cookies work natively.
 */
async function proxyFetch(
  url: string,
  options: { method?: string; headers?: Record<string, string>; body?: string } = {}
): Promise<{ ok: boolean; status: number; body: string } | null> {
  const tabs = await chrome.tabs.query({ url: "https://www.linkedin.com/*" });
  if (tabs.length === 0 || !tabs[0].id) {
    console.warn("[LI] No LinkedIn tab found — open linkedin.com first");
    return null;
  }

  const tabId = tabs[0].id!;

  const ready = await ensureContentScript(tabId);
  if (!ready) {
    console.error("[LI] Content script not available");
    return null;
  }

  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, {
      action: "proxy_fetch",
      url,
      method: options.method || "GET",
      headers: options.headers || {},
      body: options.body || undefined,
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error("[LI] Content script error:", chrome.runtime.lastError.message);
        resolve(null);
        return;
      }
      resolve(response || null);
    });
  });
}

async function linkedInFetch(
  url: string,
  options: { method?: string; body?: string } = {}
): Promise<{ ok: boolean; status: number; data: unknown } | null> {
  const canCall = await canMakeApiCall();
  if (!canCall) {
    console.warn("[LI] Rate limit reached, skipping API call");
    return null;
  }

  const auth = await getLinkedInAuth();
  if (!auth.csrfToken) {
    console.warn("[LI] No CSRF token available");
    return null;
  }

  await randomDelay();
  await recordApiCall();

  const headers: Record<string, string> = {
    "csrf-token": auth.csrfToken,
    "x-restli-protocol-version": "2.0.0",
    "x-li-lang": "fr_FR",
  };

  if (options.body) {
    headers["Content-Type"] = "application/json";
  }

  const response = await proxyFetch(url, {
    method: options.method || "GET",
    headers,
    body: options.body,
  });

  if (!response) {
    console.error("[LI] Proxy fetch failed for: " + url.slice(0, 120));
    return null;
  }

  if (!response.ok) {
    console.error("[LI] API error " + response.status + ": " + url.slice(0, 120) + "\n[LI] Response: " + (response.body || "").slice(0, 300));
    return null;
  }

  try {
    const data = JSON.parse(response.body);
    return { ok: true, status: response.status, data };
  } catch {
    console.error("[LI] Failed to parse JSON response for: " + url.slice(0, 120));
    return null;
  }
}

// ---- Mailbox URN discovery ----

/**
 * Fetch the current user's mailbox URN via /me endpoint.
 * The mailboxUrn is needed for all GraphQL messaging calls.
 */
export async function fetchMailboxUrn(): Promise<string | null> {
  // Check if already cached
  const auth = await getLinkedInAuth();
  if (auth.mailboxUrn) return auth.mailboxUrn;

  const result = await linkedInFetch(LINKEDIN_ENDPOINTS.me);
  if (!result) return null;

  const data = result.data as Record<string, unknown>;
  console.log("[LI] /me response keys:", Object.keys(data));

  let mailboxUrn: string | null = null;

  // Try miniProfile.entityUrn (urn:li:fs_miniProfile:ENTITY_ID → urn:li:fsd_profile:ENTITY_ID)
  const miniProfile = data.miniProfile as Record<string, unknown> | undefined;
  if (miniProfile?.entityUrn) {
    const entityUrn = miniProfile.entityUrn as string;
    const entityId = entityUrn.split(":").pop();
    if (entityId) {
      mailboxUrn = `urn:li:fsd_profile:${entityId}`;
    }
  }

  // Fallback: try direct entityUrn
  if (!mailboxUrn && data.entityUrn) {
    const entityUrn = data.entityUrn as string;
    if (entityUrn.includes("fsd_profile")) {
      mailboxUrn = entityUrn;
    } else {
      const entityId = entityUrn.split(":").pop();
      if (entityId) {
        mailboxUrn = `urn:li:fsd_profile:${entityId}`;
      }
    }
  }

  // Fallback: try publicIdentifier to build profile and get entityUrn
  if (!mailboxUrn && data.publicIdentifier) {
    console.log("[LI] /me has publicIdentifier but no entityUrn, trying profile fetch...");
    const profileResult = await linkedInFetch(
      LINKEDIN_ENDPOINTS.profile(data.publicIdentifier as string)
    );
    if (profileResult) {
      const profileData = profileResult.data as Record<string, unknown>;
      const profileMini = profileData.miniProfile as Record<string, unknown> | undefined;
      const urn = (profileMini?.entityUrn as string) || (profileData.entityUrn as string);
      if (urn) {
        const entityId = urn.split(":").pop();
        if (entityId) mailboxUrn = `urn:li:fsd_profile:${entityId}`;
      }
    }
  }

  if (mailboxUrn) {
    console.log("[LI] mailboxUrn resolved:", mailboxUrn);
    await setLinkedInAuth({ mailboxUrn });
  } else {
    console.error("[LI] Could not resolve mailboxUrn from /me data:", JSON.stringify(data).slice(0, 500));
  }

  return mailboxUrn;
}

// ---- Profile ----

export async function fetchProfile(slug: string): Promise<LinkedInProfile | null> {
  const result = await linkedInFetch(LINKEDIN_ENDPOINTS.profile(slug));
  if (!result) return null;

  const data = result.data as Record<string, unknown>;

  return {
    publicIdentifier: (data.publicIdentifier as string) || slug,
    firstName: (data.firstName as string) || "",
    lastName: (data.lastName as string) || "",
    headline: (data.headline as string) || "",
    locationName: (data.locationName as string) || "",
    industryName: (data.industryName as string) || "",
    connectionCount: (data.connectionCount as number) || 0,
    profilePictureUrl:
      (data.profilePicture as Record<string, Record<string, Record<string, string>>>)
        ?.displayImageReference?.vectorImage?.rootUrl || null,
  };
}

// ---- Conversations (GraphQL) ----

export async function fetchConversations(count: number = 20): Promise<LinkedInConversation[]> {
  const mailboxUrn = await fetchMailboxUrn();
  if (!mailboxUrn) {
    console.error("[LI] Cannot fetch conversations — no mailboxUrn");
    return [];
  }

  // Use paginated endpoint with INBOX filter (matches LinkedIn's real behavior)
  const url = LINKEDIN_ENDPOINTS.graphqlConversationsPaginated(mailboxUrn, count);
  console.log("[LI] Fetching conversations:", url.slice(0, 150));

  const result = await linkedInFetch(url);
  if (!result) {
    // Fallback: try basic conversations endpoint
    console.log("[LI] Paginated failed, trying basic conversations endpoint...");
    const fallbackUrl = LINKEDIN_ENDPOINTS.graphqlConversations(mailboxUrn);
    const fallbackResult = await linkedInFetch(fallbackUrl);
    if (!fallbackResult) return [];
    return parseConversationsResponse(fallbackResult.data);
  }

  return parseConversationsResponse(result.data);
}

function parseConversationsResponse(data: unknown): LinkedInConversation[] {
  const root = data as Record<string, unknown>;
  console.log("[LI] Conversations response keys:", Object.keys(root));

  // Navigate to elements — try multiple paths
  let elements: Array<Record<string, unknown>> = [];

  // Path 1: data.messengerConversationsBySyncToken.elements
  const dataObj = root.data as Record<string, unknown> | undefined;
  if (dataObj) {
    console.log("[LI] data keys:", Object.keys(dataObj));
    const syncToken = dataObj.messengerConversationsBySyncToken as Record<string, unknown> | undefined;
    if (syncToken) {
      elements = (syncToken.elements as Array<Record<string, unknown>>) || [];
      console.log("[LI] Found", elements.length, "conversations via messengerConversationsBySyncToken");
    }

    // Path 2: data.messengerConversationsByLastUpdatedBefore.elements (paginated)
    if (elements.length === 0) {
      const byLastUpdated = dataObj.messengerConversationsByLastUpdatedBefore as Record<string, unknown> | undefined;
      if (byLastUpdated) {
        elements = (byLastUpdated.elements as Array<Record<string, unknown>>) || [];
        console.log("[LI] Found", elements.length, "conversations via messengerConversationsByLastUpdatedBefore");
      }
    }

    // Path 3: try all keys that look like messenger*
    if (elements.length === 0) {
      for (const key of Object.keys(dataObj)) {
        if (key.startsWith("messenger") && typeof dataObj[key] === "object") {
          const obj = dataObj[key] as Record<string, unknown>;
          if (Array.isArray(obj.elements)) {
            elements = obj.elements as Array<Record<string, unknown>>;
            console.log("[LI] Found", elements.length, "conversations via", key);
            break;
          }
        }
      }
    }
  }

  // Path 4: root.elements (direct)
  if (elements.length === 0 && Array.isArray(root.elements)) {
    elements = root.elements as Array<Record<string, unknown>>;
  }

  if (elements.length === 0) {
    console.warn("[LI] No conversation elements found in response");
    console.log("[LI] Full response (truncated):", JSON.stringify(data).slice(0, 1000));
    return [];
  }

  // Log first element structure for debugging
  if (elements.length > 0) {
    console.log("[LI] First conversation keys:", Object.keys(elements[0]));
  }

  return elements.map((conv) => {
    // Extract conversation URN
    const entityUrn = (conv.entityUrn as string) || (conv.backendUrn as string) || "";

    // Extract a simple conversation ID for storage
    // From: urn:li:msg_conversation:(urn:li:fsd_profile:XXX,2-THREAD_ID)
    // Extract: the full URN (we'll use it for fetching messages)
    const conversationId = entityUrn;

    // Parse participants from conversationParticipants array
    const participants = parseParticipants(conv);

    // Last activity timestamp
    const lastActivityAt = (conv.lastActivityAt as number) ||
      (conv.lastReadAt as number) ||
      Date.now();

    return {
      conversationId,
      conversationUrn: entityUrn,
      participants,
      lastActivityAt,
    };
  });
}

function parseParticipants(conv: Record<string, unknown>): Array<{
  publicIdentifier: string;
  firstName: string;
  lastName: string;
}> {
  const participants: Array<{ publicIdentifier: string; firstName: string; lastName: string }> = [];

  // Try conversationParticipants array (new GraphQL format)
  const convParticipants = conv.conversationParticipants as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(convParticipants)) {
    for (const p of convParticipants) {
      const member = extractMember(p);
      if (member) participants.push(member);
    }
  }

  // Fallback: participants array (old format)
  if (participants.length === 0) {
    const oldParticipants = conv.participants as Array<Record<string, unknown>> | undefined;
    if (Array.isArray(oldParticipants)) {
      for (const p of oldParticipants) {
        const member = extractMember(p);
        if (member) participants.push(member);
      }
    }
  }

  return participants;
}

function extractMember(participant: Record<string, unknown>): {
  publicIdentifier: string;
  firstName: string;
  lastName: string;
} | null {
  // New format: participantType.member
  const participantType = participant.participantType as Record<string, Record<string, unknown>> | undefined;
  const member = participantType?.member;

  if (member) {
    // firstName/lastName can be { text: "..." } or direct strings
    const firstName = typeof member.firstName === "object"
      ? ((member.firstName as Record<string, string>)?.text || "")
      : (member.firstName as string || "");
    const lastName = typeof member.lastName === "object"
      ? ((member.lastName as Record<string, string>)?.text || "")
      : (member.lastName as string || "");

    // Extract identifier from profileUrl: "https://www.linkedin.com/in/IDENTIFIER"
    const profileUrl = member.profileUrl as string || "";
    const publicIdentifier = profileUrl.split("/in/")[1]?.replace(/\/$/, "") || "";

    return { publicIdentifier, firstName, lastName };
  }

  // Old format: miniProfile
  const miniProfile = (participant.miniProfile as Record<string, unknown>) ||
    (participant["com.linkedin.voyager.messaging.MessagingMember"] as Record<string, unknown>)?.miniProfile as Record<string, unknown>;

  if (miniProfile) {
    return {
      publicIdentifier: (miniProfile.publicIdentifier as string) || "",
      firstName: (miniProfile.firstName as string) || "",
      lastName: (miniProfile.lastName as string) || "",
    };
  }

  return null;
}

// ---- Messages (GraphQL) ----

export async function fetchMessages(
  conversationUrn: string,
  count: number = 40
): Promise<LinkedInMessage[]> {
  if (!conversationUrn) return [];

  const url = LINKEDIN_ENDPOINTS.graphqlMessages(conversationUrn);
  console.log("[LI] Fetching messages for:", conversationUrn.slice(0, 80));

  const result = await linkedInFetch(url);
  if (!result) return [];

  return parseMessagesResponse(result.data, conversationUrn);
}

function parseMessagesResponse(data: unknown, conversationUrn: string): LinkedInMessage[] {
  const root = data as Record<string, unknown>;

  // Navigate to elements — try multiple paths
  let elements: Array<Record<string, unknown>> = [];

  const dataObj = root.data as Record<string, unknown> | undefined;
  if (dataObj) {
    // Path 1: data.messengerMessagesBySyncToken.elements
    const syncToken = dataObj.messengerMessagesBySyncToken as Record<string, unknown> | undefined;
    if (syncToken?.elements) {
      elements = syncToken.elements as Array<Record<string, unknown>>;
    }

    // Path 2: data.messengerMessagesByAnchorTimestamp.elements
    if (elements.length === 0) {
      const byAnchor = dataObj.messengerMessagesByAnchorTimestamp as Record<string, unknown> | undefined;
      if (byAnchor?.elements) {
        elements = byAnchor.elements as Array<Record<string, unknown>>;
      }
    }

    // Path 3: try all messenger* keys
    if (elements.length === 0) {
      for (const key of Object.keys(dataObj)) {
        if (key.startsWith("messenger") && typeof dataObj[key] === "object") {
          const obj = dataObj[key] as Record<string, unknown>;
          if (Array.isArray(obj.elements)) {
            elements = obj.elements as Array<Record<string, unknown>>;
            console.log("[LI] Found", elements.length, "messages via", key);
            break;
          }
        }
      }
    }
  }

  // Direct elements
  if (elements.length === 0 && Array.isArray(root.elements)) {
    elements = root.elements as Array<Record<string, unknown>>;
  }

  if (elements.length === 0) {
    console.warn("[LI] No message elements found");
    console.log("[LI] Messages response (truncated):", JSON.stringify(data).slice(0, 1000));
    return [];
  }

  if (elements.length > 0) {
    console.log("[LI] First message keys:", Object.keys(elements[0]));
  }

  return elements
    .filter((e) => {
      // Filter to member-to-member messages (skip system messages)
      const subtype = e.subtype as string | undefined;
      // Accept if no subtype filter or if MEMBER_TO_MEMBER
      return !subtype || subtype === "MEMBER_TO_MEMBER";
    })
    .map((e) => {
      // Message ID from entityUrn
      const entityUrn = (e.entityUrn as string) || "";
      const messageId = entityUrn.split(":").pop() || entityUrn || String(e.deliveredAt || Date.now());

      // Sender — new format: sender.participantType.member or sender.member
      const sender = extractMessageSender(e);

      // Body — new format: body.text or body as string
      const bodyObj = e.body;
      const body = typeof bodyObj === "object"
        ? ((bodyObj as Record<string, string>)?.text || "")
        : (bodyObj as string || "");

      // Timestamp
      const sentAt = (e.deliveredAt as number) || (e.createdAt as number) || 0;

      return {
        messageId,
        conversationId: conversationUrn,
        sender,
        body,
        sentAt,
      };
    });
}

function extractMessageSender(message: Record<string, unknown>): string {
  // New GraphQL format: sender.participantType.member
  const sender = message.sender as Record<string, unknown> | undefined;
  if (sender) {
    const participantType = sender.participantType as Record<string, Record<string, unknown>> | undefined;
    const member = participantType?.member;
    if (member) {
      const profileUrl = member.profileUrl as string || "";
      return profileUrl.split("/in/")[1]?.replace(/\/$/, "") || "unknown";
    }
    // Try sender.member directly
    const directMember = sender.member as Record<string, unknown> | undefined;
    if (directMember?.profileUrl) {
      return (directMember.profileUrl as string).split("/in/")[1]?.replace(/\/$/, "") || "unknown";
    }
  }

  // Old format: from.com.linkedin.voyager.messaging.MessagingMember.miniProfile
  const from = message.from as Record<string, Record<string, unknown>> | undefined;
  if (from) {
    const msgMember = from["com.linkedin.voyager.messaging.MessagingMember"];
    if (msgMember) {
      const miniProfile = msgMember.miniProfile as Record<string, unknown>;
      return (miniProfile?.publicIdentifier as string) || "unknown";
    }
  }

  // Last resort: actorUrn or senderUrn
  const actorUrn = (message.actorUrn as string) || (message.senderUrn as string) || "";
  if (actorUrn) {
    return actorUrn.split(":").pop() || "unknown";
  }

  return "unknown";
}

// ---- Send Message ----

export async function sendLinkedInMessage(
  conversationUrn: string,
  body: string
): Promise<boolean> {
  const auth = await getLinkedInAuth();
  if (!auth.csrfToken) return false;

  const canCall = await canMakeApiCall();
  if (!canCall) return false;

  await randomDelay();
  await recordApiCall();

  // Try new dash API first
  if (auth.mailboxUrn) {
    console.log("[LI] Trying dash sendMessage API...");
    const dashResponse = await proxyFetch(LINKEDIN_ENDPOINTS.sendMessage, {
      method: "POST",
      headers: {
        "csrf-token": auth.csrfToken,
        "x-restli-protocol-version": "2.0.0",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mailboxUrn: auth.mailboxUrn,
        conversationUrn,
        message: {
          body: { text: body },
        },
      }),
    });

    if (dashResponse?.ok) {
      console.log("[LI] Message sent via dash API");
      return true;
    }
    console.log("[LI] Dash API failed (" + (dashResponse?.status || "no response") + "), trying REST fallback...");
  }

  // Fallback: old REST endpoint with extracted thread ID
  const threadId = extractThreadId(conversationUrn);
  const url = LINKEDIN_ENDPOINTS.conversationEvents(threadId);

  const response = await proxyFetch(url, {
    method: "POST",
    headers: {
      "csrf-token": auth.csrfToken,
      "x-restli-protocol-version": "2.0.0",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      eventCreate: {
        value: {
          "com.linkedin.voyager.messaging.create.MessageCreate": {
            body,
            attachments: [],
            attributedBody: { text: body, attributes: [] },
          },
        },
      },
    }),
  });

  if (response?.ok) {
    console.log("[LI] Message sent via REST fallback");
    return true;
  }

  console.error("[LI] Both send methods failed for:", conversationUrn.slice(0, 80));
  return false;
}

/**
 * Extract thread ID from conversation URN.
 * urn:li:msg_conversation:(urn:li:fsd_profile:XXX,2-THREAD_ID) → 2-THREAD_ID
 */
function extractThreadId(conversationUrn: string): string {
  const match = conversationUrn.match(/,([^)]+)\)$/);
  return match ? match[1] : conversationUrn;
}
