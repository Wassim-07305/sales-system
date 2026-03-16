"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { aiComplete, aiJSON } from "@/lib/ai/client";
import { notifyMany } from "@/lib/actions/notifications";

// ---------------------------------------------------------------------------
// Video Rooms
// ---------------------------------------------------------------------------

export async function getVideoRooms() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const { data } = await supabase
    .from("video_rooms")
    .select(
      "*, host:profiles!video_rooms_host_id_fkey(id, email, full_name, avatar_url, role)",
    )
    .order("scheduled_at", { ascending: false });

  return (data || []).map((r: Record<string, unknown>) => ({
    ...r,
    host: Array.isArray(r.host) ? r.host[0] || null : r.host,
  }));
}

export async function createVideoRoom(data: {
  title: string;
  scheduledAt?: string;
  maxParticipants?: number;
  instant?: boolean;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const now = new Date().toISOString();
  const isInstant = data.instant === true;

  const { data: room, error } = await supabase
    .from("video_rooms")
    .insert({
      title: data.title,
      host_id: user.id,
      status: isInstant ? "live" : "scheduled",
      scheduled_at: isInstant ? now : data.scheduledAt,
      started_at: isInstant ? now : null,
      max_participants: data.maxParticipants || 10,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  // --- Push notification: notify all team members about the new video room ---
  try {
    const { data: allUsers } = await supabase
      .from("profiles")
      .select("id")
      .neq("id", user.id);

    if (allUsers && allUsers.length > 0) {
      const userIds = allUsers.map((u: { id: string }) => u.id);
      const scheduledLabel = data.scheduledAt
        ? new Date(data.scheduledAt).toLocaleString("fr-FR", {
            dateStyle: "long",
            timeStyle: "short",
          })
        : "maintenant";
      const notifBody = isInstant
        ? `Un appel vidéo "${data.title}" vient de démarrer. Rejoignez-le !`
        : `Un appel vidéo "${data.title}" est prévu le ${scheduledLabel}.`;

      await notifyMany(userIds, "Nouvel appel vidéo", notifBody, {
        link: `/chat/video/${room.id}`,
        type: "video_call",
      });
    }
  } catch {
    // Ne pas bloquer la création de la room si les notifications échouent
  }

  revalidatePath("/chat/video");
  return room;
}

export async function joinRoom(roomId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  // Check if already joined
  const { data: existing } = await supabase
    .from("video_room_participants")
    .select("id")
    .eq("room_id", roomId)
    .eq("user_id", user.id)
    .is("left_at", null)
    .single();

  if (existing) return;

  await supabase.from("video_room_participants").insert({
    room_id: roomId,
    user_id: user.id,
    joined_at: new Date().toISOString(),
  });

  revalidatePath(`/chat/video/${roomId}`);
}

export async function startRoom(roomId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const { error } = await supabase
    .from("video_rooms")
    .update({
      status: "live",
      started_at: new Date().toISOString(),
    })
    .eq("id", roomId);

  if (error) throw new Error(error.message);
  revalidatePath(`/chat/video/${roomId}`);
  revalidatePath("/chat/video");
}

export async function endRoom(roomId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const { error } = await supabase
    .from("video_rooms")
    .update({
      status: "ended",
      ended_at: new Date().toISOString(),
    })
    .eq("id", roomId);

  if (error) throw new Error(error.message);

  // Mark all participants as left
  await supabase
    .from("video_room_participants")
    .update({ left_at: new Date().toISOString() })
    .eq("room_id", roomId)
    .is("left_at", null);

  revalidatePath(`/chat/video/${roomId}`);
  revalidatePath("/chat/video");
}

export async function getVideoRoom(roomId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const { data: room } = await supabase
    .from("video_rooms")
    .select(
      "*, host:profiles!video_rooms_host_id_fkey(id, email, full_name, avatar_url, role)",
    )
    .eq("id", roomId)
    .single();

  if (!room) return null;

  const { data: participants } = await supabase
    .from("video_room_participants")
    .select(
      "*, user:profiles!video_room_participants_user_id_fkey(id, email, full_name, avatar_url, role)",
    )
    .eq("room_id", roomId)
    .order("joined_at", { ascending: true });

  return {
    ...room,
    host: Array.isArray(room.host) ? room.host[0] || null : room.host,
    participants: (participants || []).map((p: Record<string, unknown>) => ({
      ...p,
      user: Array.isArray(p.user) ? p.user[0] || null : p.user,
    })),
  };
}

export async function getRecording(roomId: string) {
  // Récupérer l'enregistrement depuis la base — transcription externe si configurée
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const { data: room } = await supabase
    .from("video_rooms")
    .select("recording_url, ai_summary, chapters, title, started_at, ended_at")
    .eq("id", roomId)
    .single();

  if (!room) return null;

  return {
    recording_url: room.recording_url || null,
    ai_summary: room.ai_summary || null,
    chapters: room.chapters || [],
    title: room.title,
    started_at: room.started_at,
    ended_at: room.ended_at,
  };
}

// ---------------------------------------------------------------------------
// Broadcast Messages
// ---------------------------------------------------------------------------

export async function sendBroadcast(data: {
  targetRoles: string[];
  targetAudience: string;
  subject: string;
  content: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  // AI mode check — block if critical validation requires approval
  try {
    const { checkCriticalAction } = await import("@/lib/actions/ai-modes");
    const aiCheck = await checkCriticalAction("Envoi de message initial");
    if (aiCheck.requiresValidation) {
      throw new Error(
        "Action bloquée : cette action nécessite une validation manuelle (mode IA critique activé)",
      );
    }
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("Action bloquée"))
      throw err;
  }

  // Only admin/manager can send broadcasts
  const { data: senderProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!senderProfile || !["admin", "manager"].includes(senderProfile.role)) {
    throw new Error("Accès réservé aux administrateurs");
  }

  // Find matching users based on target roles
  let query = supabase.from("profiles").select("id, role");

  if (data.targetRoles.length > 0) {
    query = query.in("role", data.targetRoles);
  }

  const { data: targets } = await query;
  const targetUsers = targets || [];
  const sentCount = targetUsers.length;

  // Create the broadcast message
  const { error } = await supabase.from("broadcast_messages").insert({
    sender_id: user.id,
    target_roles: data.targetRoles,
    target_audience: data.targetAudience,
    subject: data.subject,
    content: data.content,
    sent_count: sentCount,
  });

  if (error) throw new Error(error.message);

  // Create notifications for each target user
  if (targetUsers.length > 0) {
    const userIds = targetUsers.map((t: { id: string }) => t.id);
    await notifyMany(
      userIds,
      data.subject || "Nouvelle diffusion",
      data.content.substring(0, 200),
      { type: "broadcast" },
    );
  }

  revalidatePath("/chat/broadcast");
  return { sentCount };
}

export async function getBroadcasts() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const { data } = await supabase
    .from("broadcast_messages")
    .select(
      "*, sender:profiles!broadcast_messages_sender_id_fkey(id, email, full_name, avatar_url, role)",
    )
    .order("created_at", { ascending: false });

  return (data || []).map((b: Record<string, unknown>) => ({
    ...b,
    sender: Array.isArray(b.sender) ? b.sender[0] || null : b.sender,
  }));
}

// ---------------------------------------------------------------------------
// Polls
// ---------------------------------------------------------------------------

export async function createPoll(data: {
  roomId?: string;
  channelId?: string;
  question: string;
  options: string[];
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const pollOptions = data.options.map((text) => ({ text, vote_count: 0 }));

  const { error } = await supabase.from("polls").insert({
    room_id: data.roomId || null,
    channel_id: data.channelId || null,
    created_by: user.id,
    question: data.question,
    options: pollOptions,
    is_active: true,
  });

  if (error) throw new Error(error.message);

  if (data.roomId) {
    revalidatePath(`/chat/video/${data.roomId}`);
  }
}

export async function votePoll(pollId: string, optionIndex: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  // Get current poll
  const { data: poll } = await supabase
    .from("polls")
    .select("options")
    .eq("id", pollId)
    .single();

  if (!poll) throw new Error("Sondage introuvable");

  const options = poll.options as Array<{ text: string; vote_count: number }>;
  if (optionIndex < 0 || optionIndex >= options.length) {
    throw new Error("Option invalide");
  }

  options[optionIndex].vote_count += 1;

  const { error } = await supabase
    .from("polls")
    .update({ options })
    .eq("id", pollId);

  if (error) throw new Error(error.message);
  revalidatePath("/chat/video");
}

export async function getRoomPolls(roomId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const { data } = await supabase
    .from("polls")
    .select("*")
    .eq("room_id", roomId)
    .order("created_at", { ascending: false });

  return data || [];
}

// ---------------------------------------------------------------------------
// Q&A (Live Questions)
// ---------------------------------------------------------------------------

export async function submitQuestion(roomId: string, question: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifie");

  const { error } = await supabase.from("live_questions").insert({
    room_id: roomId,
    user_id: user.id,
    question,
    is_answered: false,
    upvotes: 0,
  });

  if (error) throw new Error(error.message);
  revalidatePath(`/chat/video/${roomId}`);
}

export async function upvoteQuestion(questionId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const { data: q } = await supabase
    .from("live_questions")
    .select("upvotes")
    .eq("id", questionId)
    .single();

  if (!q) return;

  await supabase
    .from("live_questions")
    .update({ upvotes: (q.upvotes || 0) + 1 })
    .eq("id", questionId);

  revalidatePath("/chat/video");
}

export async function markQuestionAnswered(questionId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  await supabase
    .from("live_questions")
    .update({ is_answered: true, answered_at: new Date().toISOString() })
    .eq("id", questionId);
  revalidatePath("/chat/video");
}

export async function getRoomQuestions(roomId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const { data } = await supabase
    .from("live_questions")
    .select(
      "*, user:profiles!live_questions_user_id_fkey(full_name, avatar_url)",
    )
    .eq("room_id", roomId)
    .order("upvotes", { ascending: false });

  return (data || []).map((q: Record<string, unknown>) => ({
    ...q,
    user: Array.isArray(q.user) ? q.user[0] || null : q.user,
  }));
}

// ---------------------------------------------------------------------------
// Unread & Status Tracking (F34.2)
// ---------------------------------------------------------------------------

/**
 * Returns the number of unread messages per channel for the current user.
 * Compares each channel's latest message created_at against the user's
 * last_read_at stored in channel_reads.
 */
export async function getUnreadCounts(): Promise<Record<string, number>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return {};

  // Fetch the user's read timestamps
  const { data: reads } = await supabase
    .from("channel_reads")
    .select("channel_id, last_read_at")
    .eq("user_id", user.id);

  const readMap: Record<string, string> = {};
  for (const r of reads || []) {
    readMap[r.channel_id] = r.last_read_at;
  }

  // Fetch all channels
  const { data: channels } = await supabase.from("channels").select("id");

  if (!channels || channels.length === 0) return {};

  const counts: Record<string, number> = {};

  for (const channel of channels) {
    let query = supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("channel_id", channel.id)
      .neq("sender_id", user.id);

    const lastRead = readMap[channel.id];
    if (lastRead) {
      query = query.gt("created_at", lastRead);
    }

    const { count } = await query;
    if (count && count > 0) {
      counts[channel.id] = count;
    }
  }

  return counts;
}

/**
 * Returns the total unread message count across all channels (for nav badge).
 */
export async function getTotalUnreadCount(): Promise<number> {
  const counts = await getUnreadCounts();
  return Object.values(counts).reduce((sum, n) => sum + n, 0);
}

/**
 * Marks all messages in a channel as read by upserting the user's last_read_at.
 */
export async function markChannelAsRead(channelId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  // Check if a row already exists
  const { data: existing } = await supabase
    .from("channel_reads")
    .select("id")
    .eq("channel_id", channelId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("channel_reads")
      .update({ last_read_at: new Date().toISOString() })
      .eq("id", existing.id);
  } else {
    await supabase.from("channel_reads").insert({
      channel_id: channelId,
      user_id: user.id,
      last_read_at: new Date().toISOString(),
    });
  }

  revalidatePath("/chat");
}

// ---------------------------------------------------------------------------
// AI Helpers
// ---------------------------------------------------------------------------

export async function generateAiReply(context: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  try {
    const suggestion = await aiComplete(
      `Contexte de la conversation :\n${context}\n\nGénère une réponse professionnelle et naturelle en français, adaptée au contexte. 2-3 phrases maximum. Sois direct et utile.`,
      {
        system:
          "Tu es un assistant pour un coach en vente/setting chez S Academy. Tu rédiges des réponses aux messages de clients. Ton ton est professionnel, chaleureux et orienté action. Réponds uniquement avec le texte du message, sans guillemets ni préfixe.",
        maxTokens: 256,
      },
    );

    return { suggestion, context };
  } catch {
    return {
      suggestion:
        "Merci pour votre message ! Je reviens vers vous rapidement avec une réponse détaillée.",
      context,
    };
  }
}

export async function generatePostCallSummary(roomId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  // Fetch room details for context
  const { data: room } = await supabase
    .from("video_rooms")
    .select("title, started_at, ended_at")
    .eq("id", roomId)
    .single();

  // Fetch participants for context
  const { data: participants } = await supabase
    .from("video_room_participants")
    .select("user:profiles!video_room_participants_user_id_fkey(full_name)")
    .eq("room_id", roomId);

  const participantNames = (participants || [])
    .map((p: Record<string, unknown>) => {
      const user = Array.isArray(p.user) ? p.user[0] : p.user;
      return (user as Record<string, unknown>)?.full_name || "Participant";
    })
    .join(", ");

  const durationMs =
    room?.started_at && room?.ended_at
      ? new Date(room.ended_at).getTime() - new Date(room.started_at).getTime()
      : 0;
  const durationMin = Math.round(durationMs / 60000);

  try {
    const result = await aiJSON<{
      summary: string;
      sentiment: string;
      keyTopics: string[];
    }>(
      `Génère un résumé structuré pour cette visioconférence.

Titre : ${room?.title || "Appel de groupe"}
Participants : ${participantNames || "Non renseignés"}
Durée : ${durationMin || "?"} minutes

Génère un résumé réaliste et professionnel basé sur le titre et le contexte.

Réponds en JSON :
{
  "summary": "<résumé structuré avec bullet points (\\n• point 1\\n• point 2) et actions à suivre>",
  "sentiment": "<positif|neutre|négatif>",
  "keyTopics": ["<topic 1>", "<topic 2>", "<topic 3>"]
}`,
      {
        system:
          "Tu es un assistant de productivité pour S Academy, une école de vente/setting. Réponds en français.",
      },
    );

    // Save summary to the room
    await supabase
      .from("video_rooms")
      .update({ ai_summary: result.summary })
      .eq("id", roomId);

    return {
      roomId,
      ...result,
      duration: `${durationMin} minutes`,
    };
  } catch {
    return {
      roomId,
      summary:
        "Résumé automatique indisponible. Veuillez réécouter l'enregistrement.",
      sentiment: "neutre",
      duration: `${durationMin} minutes`,
      keyTopics: [room?.title || "Appel"],
    };
  }
}

// ---------------------------------------------------------------------------
// Message Reactions (Slack-style)
// ---------------------------------------------------------------------------

export async function toggleReaction(messageId: string, emoji: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const { data: existing } = await supabase
    .from("message_reactions")
    .select("id")
    .eq("message_id", messageId)
    .eq("user_id", user.id)
    .eq("emoji", emoji)
    .maybeSingle();

  if (existing) {
    await supabase.from("message_reactions").delete().eq("id", existing.id);
    return { action: "removed" as const };
  } else {
    await supabase.from("message_reactions").insert({
      message_id: messageId,
      user_id: user.id,
      emoji,
    });
    return { action: "added" as const };
  }
}

// ---------------------------------------------------------------------------
// Direct Messages (1-to-1)
// ---------------------------------------------------------------------------

export async function getOrCreateDM(otherUserId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  // Look for existing DM between these two users
  const { data: channels } = await supabase
    .from("channels")
    .select("*")
    .eq("type", "direct")
    .contains("members", [user.id, otherUserId]);

  const existing = channels?.find(
    (c) =>
      c.members?.length === 2 &&
      c.members.includes(user.id) &&
      c.members.includes(otherUserId),
  );

  if (existing) return existing;

  // Get other user's name
  const { data: otherProfile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", otherUserId)
    .single();

  const { data: myProfile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  // Use admin client to bypass RLS for channel creation
  const adminClient = createAdminClient();
  const { data: newChannel, error } = await adminClient
    .from("channels")
    .insert({
      name: `${myProfile?.full_name || "Utilisateur"} & ${otherProfile?.full_name || "Utilisateur"}`,
      type: "direct",
      created_by: user.id,
      members: [user.id, otherUserId],
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return newChannel;
}

// ---------------------------------------------------------------------------
// Edit / Delete Messages
// ---------------------------------------------------------------------------

export async function editMessage(messageId: string, content: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  // Use admin client to bypass RLS (no UPDATE policy on messages)
  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from("messages")
    .update({ content, is_edited: true })
    .eq("id", messageId)
    .eq("sender_id", user.id);

  if (error) throw new Error(error.message);
  revalidatePath("/chat");
}

export async function deleteMessage(messageId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isAdmin = ["admin", "manager"].includes(profile?.role || "");

  // Use admin client to bypass RLS (no DELETE policy on messages)
  const adminClient = createAdminClient();
  if (isAdmin) {
    const { error } = await adminClient
      .from("messages")
      .delete()
      .eq("id", messageId);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await adminClient
      .from("messages")
      .delete()
      .eq("id", messageId)
      .eq("sender_id", user.id);
    if (error) throw new Error(error.message);
  }
}

// ---------------------------------------------------------------------------
// Save Recording Metadata (GAP 1: auto-import replay after recording)
// ---------------------------------------------------------------------------

/**
 * Called after a recording is uploaded to Supabase Storage.
 * Updates the video_rooms record with recording_url and duration,
 * ensuring the replay appears in the replays section.
 */
export async function saveRecordingMetadata(data: {
  roomId: string;
  recordingUrl: string;
  durationSeconds?: number | null;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  // Build the update payload
  const updatePayload: Record<string, unknown> = {
    recording_url: data.recordingUrl,
  };

  // If the room doesn't have ended_at set yet, set it now
  const { data: room } = await supabase
    .from("video_rooms")
    .select("started_at, ended_at, status, title")
    .eq("id", data.roomId)
    .single();

  if (!room) throw new Error("Salle introuvable");

  // Ensure the room is marked as ended so it appears in replays
  if (room.status !== "ended") {
    updatePayload.status = "ended";
    updatePayload.ended_at = new Date().toISOString();
  }

  // If we have duration and no ended_at, compute ended_at from started_at + duration
  if (data.durationSeconds && room.started_at && !room.ended_at) {
    const endTime = new Date(
      new Date(room.started_at).getTime() + data.durationSeconds * 1000,
    ).toISOString();
    updatePayload.ended_at = endTime;
  }

  const { error } = await supabase
    .from("video_rooms")
    .update(updatePayload)
    .eq("id", data.roomId);

  if (error) throw new Error(error.message);

  // Also try to save to group_calls table if it exists (graceful fallback)
  try {
    const title =
      room.title || `Appel du ${new Date().toLocaleDateString("fr-FR")}`;
    await supabase.from("group_calls").insert({
      room_id: data.roomId,
      title,
      recording_url: data.recordingUrl,
      recorded_at: new Date().toISOString(),
      duration: data.durationSeconds || null,
      host_id: user.id,
    });
  } catch {
    // group_calls table may not exist — that's fine, video_rooms is the primary source
  }

  revalidatePath("/chat/replays");
  revalidatePath("/chat/video");
  return { success: true };
}

// ---------------------------------------------------------------------------
// Notify Upcoming Calls (GAP 2: push reminders for today's calls)
// ---------------------------------------------------------------------------

/**
 * Sends push notifications for video rooms scheduled today.
 * Designed to be called from the daily cron job.
 * Uses admin client (service role) — no auth required.
 */
export async function notifyUpcomingCalls() {
  const { createClient: createServiceClient } =
    await import("@supabase/supabase-js");

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!serviceRoleKey || !supabaseUrl) {
    return {
      sent: 0,
      error: "Service role key ou Supabase URL non configurés",
    };
  }

  const supabase = createServiceClient(supabaseUrl, serviceRoleKey);

  const now = new Date();
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  // Find all scheduled video rooms for today
  const { data: upcomingRooms } = await supabase
    .from("video_rooms")
    .select("id, title, scheduled_at, host_id")
    .eq("status", "scheduled")
    .gte("scheduled_at", now.toISOString())
    .lte("scheduled_at", endOfDay.toISOString());

  if (!upcomingRooms || upcomingRooms.length === 0) {
    return { sent: 0 };
  }

  let totalSent = 0;

  for (const room of upcomingRooms) {
    // Fetch all team members to notify
    const { data: allUsers } = await supabase.from("profiles").select("id");

    if (!allUsers || allUsers.length === 0) continue;

    const scheduledTime = new Date(room.scheduled_at).toLocaleString("fr-FR", {
      timeStyle: "short",
    });

    const userIds = allUsers.map((u: { id: string }) => u.id);

    // Insert notifications directly (no auth needed with service role)
    const notifications = userIds.map((uid: string) => ({
      user_id: uid,
      title: "Rappel : appel vidéo aujourd'hui",
      body: `"${room.title}" prévu à ${scheduledTime}`,
      type: "video_call_reminder",
      link: `/chat/video/${room.id}`,
    }));

    const { error } = await supabase
      .from("notifications")
      .insert(notifications);
    if (!error) totalSent += userIds.length;

    // Send web push via push_subscriptions (fire-and-forget)
    try {
      const { data: subscriptions } = await supabase
        .from("push_subscriptions")
        .select("user_id, endpoint, keys")
        .in("user_id", userIds);

      if (subscriptions && subscriptions.length > 0) {
        const webPush = (await import("web-push")).default;
        const { getApiKey } = await import("@/lib/api-keys");
        const publicKey = await getApiKey("NEXT_PUBLIC_VAPID_PUBLIC_KEY");
        const privateKey = await getApiKey("VAPID_PRIVATE_KEY");
        const email =
          (await getApiKey("VAPID_EMAIL")) || "mailto:admin@salessystem.com";

        if (publicKey && privateKey) {
          webPush.setVapidDetails(email, publicKey, privateKey);
          for (const sub of subscriptions) {
            try {
              await webPush.sendNotification(
                {
                  endpoint: sub.endpoint,
                  keys: sub.keys as { p256dh: string; auth: string },
                },
                JSON.stringify({
                  title: "Rappel : appel vidéo aujourd'hui",
                  body: `"${room.title}" prévu à ${scheduledTime}`,
                  icon: "/icons/icon-192x192.png",
                  data: { url: `/chat/video/${room.id}` },
                }),
              );
            } catch {
              // Ignore individual push failures
            }
          }
        }
      }
    } catch {
      // Push delivery is best-effort
    }
  }

  return { sent: totalSent };
}
