import { getLinkedInAuth, canMakeApiCall, recordApiCall, randomDelay } from "../shared/storage";
import { LINKEDIN_ENDPOINTS } from "../shared/constants";
import type { LinkedInProfile, LinkedInConversation, LinkedInMessage } from "../shared/types";

async function linkedInFetch(url: string, options: RequestInit = {}): Promise<Response | null> {
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

  const response = await fetch(url, {
    ...options,
    headers: {
      "csrf-token": auth.csrfToken,
      "x-restli-protocol-version": "2.0.0",
      "x-li-lang": "fr_FR",
      ...(options.headers || {}),
    },
    credentials: "include",
  });

  if (!response.ok) {
    console.error("[LI] API error " + response.status + ": " + url);
    return null;
  }

  return response;
}

export async function fetchProfile(slug: string): Promise<LinkedInProfile | null> {
  const response = await linkedInFetch(LINKEDIN_ENDPOINTS.profile(slug));
  if (!response) return null;

  const data = await response.json();

  return {
    publicIdentifier: data.publicIdentifier || slug,
    firstName: data.firstName || "",
    lastName: data.lastName || "",
    headline: data.headline || "",
    locationName: data.locationName || "",
    industryName: data.industryName || "",
    connectionCount: data.connectionCount || 0,
    profilePictureUrl: data.profilePicture?.displayImageReference?.vectorImage?.rootUrl || null,
  };
}

export async function fetchConversations(count: number = 20): Promise<LinkedInConversation[]> {
  const url = LINKEDIN_ENDPOINTS.conversations + "?keyVersion=LEGACY_INBOX&count=" + count;
  const response = await linkedInFetch(url);
  if (!response) return [];

  const data = await response.json();
  const elements: Array<Record<string, unknown>> = data.elements || [];

  return elements.map((conv) => {
    const entityUrn = (conv.entityUrn as string) || "";
    const conversationId = entityUrn.split(":").pop() || "";
    const rawParticipants = (conv.participants as Array<Record<string, unknown>>) || [];

    const participants = rawParticipants.map((p) => {
      const miniProfile = (p.miniProfile as Record<string, unknown>) || {};
      return {
        publicIdentifier: (miniProfile.publicIdentifier as string) || "",
        firstName: (miniProfile.firstName as string) || "",
        lastName: (miniProfile.lastName as string) || "",
      };
    });

    return {
      conversationId,
      participants,
      lastActivityAt: (conv.lastActivityAt as number) || 0,
    };
  });
}

export async function fetchMessages(
  conversationId: string,
  count: number = 40
): Promise<LinkedInMessage[]> {
  const url = LINKEDIN_ENDPOINTS.conversationEvents(conversationId) + "?count=" + count;
  const response = await linkedInFetch(url);
  if (!response) return [];

  const data = await response.json();
  const elements: Array<Record<string, unknown>> = data.elements || [];

  return elements
    .filter((e) => e.subtype === "MEMBER_TO_MEMBER")
    .map((e) => {
      const eventContent = (e.eventContent as Record<string, Record<string, unknown>>) || {};
      const msgEvent = eventContent["com.linkedin.voyager.messaging.event.MessageEvent"] || {};
      const from = (e.from as Record<string, Record<string, unknown>>) || {};
      const msgMember = from["com.linkedin.voyager.messaging.MessagingMember"] || {};
      const miniProfile = (msgMember.miniProfile as Record<string, unknown>) || {};

      return {
        messageId: ((e.entityUrn as string) || "").split(":").pop() || "",
        conversationId,
        sender: (miniProfile.publicIdentifier as string) || "unknown",
        body: (msgEvent.body as string) || "",
        sentAt: (e.createdAt as number) || 0,
      };
    });
}

export async function sendLinkedInMessage(
  conversationId: string,
  body: string
): Promise<boolean> {
  const auth = await getLinkedInAuth();
  if (!auth.csrfToken) return false;

  const canCall = await canMakeApiCall();
  if (!canCall) return false;

  await randomDelay();
  await recordApiCall();

  const url = LINKEDIN_ENDPOINTS.conversationEvents(conversationId);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "csrf-token": auth.csrfToken,
      "x-restli-protocol-version": "2.0.0",
      "Content-Type": "application/json",
    },
    credentials: "include",
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

  return response.ok;
}
