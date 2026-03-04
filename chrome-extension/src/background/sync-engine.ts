import { fetchConversations, fetchMessages, sendLinkedInMessage } from "./linkedin-api";
import {
  upsertProspect,
  upsertConversation,
  getPendingMessages,
  markMessageSent,
  getConversationByLinkedinId,
} from "./supabase-client";
import { setSyncState, getSyncState, getAuth, getLinkedInAuth } from "../shared/storage";

export async function runSync(): Promise<void> {
  console.log("[Sync] Starting sync...");

  const auth = await getAuth();
  const liAuth = await getLinkedInAuth();

  console.log("[Sync] Auth:", auth.isAuthenticated ? "OK" : "NOT AUTHENTICATED");
  console.log("[Sync] LinkedIn CSRF:", liAuth.csrfToken ? "OK (" + liAuth.csrfToken.slice(0, 10) + "...)" : "MISSING");
  console.log("[Sync] mailboxUrn:", liAuth.mailboxUrn ? "OK" : "NOT YET RESOLVED");

  if (!auth.isAuthenticated) {
    console.warn("[Sync] Aborted — not authenticated to Sales System");
    return;
  }

  if (!liAuth.csrfToken) {
    console.warn("[Sync] Aborted — no LinkedIn CSRF token. Navigate on linkedin.com to capture it.");
    return;
  }

  const currentState = await getSyncState();
  if (currentState.syncStatus === "syncing") {
    console.warn("[Sync] Already syncing, skipping");
    return;
  }

  await setSyncState({ syncStatus: "syncing", error: null });

  try {
    let conversationsSynced = 0;
    let prospectsSynced = 0;

    console.log("[Sync] Fetching LinkedIn conversations...");
    const conversations = await fetchConversations(20);
    console.log("[Sync] Got", conversations.length, "conversations");

    for (const conv of conversations) {
      if (conv.participants.length > 2) continue;

      const otherParticipant = conv.participants[0];
      if (!otherParticipant?.publicIdentifier) {
        console.log("[Sync] Skipping conversation without participant identifier:", conv.conversationUrn?.slice(0, 60));
        continue;
      }

      const profileUrl = "https://www.linkedin.com/in/" + otherParticipant.publicIdentifier + "/";
      console.log("[Sync] Processing:", otherParticipant.firstName, otherParticipant.lastName, "(" + conv.conversationUrn?.slice(0, 60) + ")");

      const prospect = await upsertProspect({
        name: (otherParticipant.firstName + " " + otherParticipant.lastName).trim(),
        profile_url: profileUrl,
        platform: "linkedin",
      });

      if (prospect) {
        prospectsSynced++;

        // Use conversationUrn for fetching messages (new GraphQL format)
        const messages = await fetchMessages(conv.conversationUrn, 40);
        console.log("[Sync]   Messages:", messages.length);

        const formattedMessages = messages.map((msg) => ({
          sender: msg.sender === otherParticipant.publicIdentifier ? "prospect" : "damien",
          content: msg.body,
          type: "text" as const,
          timestamp: new Date(msg.sentAt).toISOString(),
          linkedin_message_id: msg.messageId,
        }));

        // Use conversationUrn as the linkedin_conversation_id (full URN)
        const linkedinConvId = conv.conversationUrn || conv.conversationId;
        const existing = await getConversationByLinkedinId(linkedinConvId);
        let mergedMessages = formattedMessages;

        if (existing) {
          const existingIds = new Set(
            (existing.messages as Array<Record<string, unknown>>)
              .map((m) => m.linkedin_message_id)
              .filter(Boolean)
          );

          const newFromLinkedIn = formattedMessages.filter(
            (m) => !existingIds.has(m.linkedin_message_id)
          );

          const existingMessages = existing.messages as Array<Record<string, unknown>>;
          mergedMessages = [
            ...existingMessages.map((m) => ({
              sender: m.sender as string,
              content: m.content as string,
              type: (m.type as string) || "text",
              timestamp: m.timestamp as string,
              linkedin_message_id: m.linkedin_message_id as string | undefined,
              pending_send: m.pending_send as boolean | undefined,
              sent_at: m.sent_at as string | undefined,
            })),
            ...newFromLinkedIn,
          ].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        }

        await upsertConversation({
          prospect_id: prospect.id,
          linkedin_conversation_id: linkedinConvId,
          platform: "linkedin",
          messages: mergedMessages,
        });

        conversationsSynced++;
      }
    }

    console.log("[Sync] Done!", conversationsSynced, "conversations,", prospectsSynced, "prospects");

    await setSyncState({
      syncStatus: "idle",
      lastSyncAt: new Date().toISOString(),
      conversationsSynced,
      prospectsSynced,
    });
  } catch (err) {
    console.error("[Sync] Error:", err);
    await setSyncState({
      syncStatus: "error",
      error: String(err),
    });
  }
}

export async function processPendingMessages(): Promise<void> {
  const auth = await getAuth();
  const liAuth = await getLinkedInAuth();

  if (!auth.isAuthenticated || !liAuth.csrfToken) return;

  const pending = await getPendingMessages();

  for (const msg of pending) {
    const sent = await sendLinkedInMessage(msg.linkedinConversationId, msg.content);
    if (sent) {
      await markMessageSent(msg.conversationDbId, msg.messageIndex);
    }
  }
}
