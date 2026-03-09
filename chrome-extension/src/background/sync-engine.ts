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
  const auth = await getAuth();
  const liAuth = await getLinkedInAuth();

  if (!auth.isAuthenticated || !liAuth.csrfToken) {
    return;
  }

  const currentState = await getSyncState();
  if (currentState.syncStatus === "syncing") {
    return;
  }

  await setSyncState({ syncStatus: "syncing", error: null });

  try {
    let conversationsSynced = 0;
    let prospectsSynced = 0;

    const conversations = await fetchConversations(20);

    for (const conv of conversations) {
      if (conv.participants.length > 2) continue;

      const otherParticipant = conv.participants[0];
      if (!otherParticipant?.publicIdentifier) continue;

      const profileUrl = "https://www.linkedin.com/in/" + otherParticipant.publicIdentifier + "/";

      const prospect = await upsertProspect({
        name: (otherParticipant.firstName + " " + otherParticipant.lastName).trim(),
        profile_url: profileUrl,
        platform: "linkedin",
      });

      if (prospect) {
        prospectsSynced++;

        const messages = await fetchMessages(conv.conversationId, 40);

        const formattedMessages = messages.map((msg) => ({
          sender: msg.sender === otherParticipant.publicIdentifier ? "prospect" : "damien",
          content: msg.body,
          type: "text" as const,
          timestamp: new Date(msg.sentAt).toISOString(),
          linkedin_message_id: msg.messageId,
        }));

        const existing = await getConversationByLinkedinId(conv.conversationId);
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
          linkedin_conversation_id: conv.conversationId,
          platform: "linkedin",
          messages: mergedMessages,
        });

        conversationsSynced++;
      }
    }

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
