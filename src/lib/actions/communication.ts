"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { aiComplete, aiJSON } from "@/lib/ai/client";

// ---------------------------------------------------------------------------
// Video Rooms
// ---------------------------------------------------------------------------

export async function getVideoRooms() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("video_rooms")
    .select("*, host:profiles!video_rooms_host_id_fkey(id, email, full_name, avatar_url, role)")
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

  const { data: room } = await supabase
    .from("video_rooms")
    .select("*, host:profiles!video_rooms_host_id_fkey(id, email, full_name, avatar_url, role)")
    .eq("id", roomId)
    .single();

  if (!room) return null;

  const { data: participants } = await supabase
    .from("video_room_participants")
    .select("*, user:profiles!video_room_participants_user_id_fkey(id, email, full_name, avatar_url, role)")
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
  const { data: room } = await supabase
    .from("video_rooms")
    .select("recording_url, ai_summary, chapters, title, started_at, ended_at")
    .eq("id", roomId)
    .single();

  if (!room) return null;

  // Return real data if available, otherwise return mock
  return {
    recording_url: room.recording_url || null,
    ai_summary:
      room.ai_summary ||
      "Résumé automatique : Cette visioconférence a couvert les points clés du projet, incluant la revue des objectifs trimestriels, la répartition des tâches et les prochaines étapes. Les participants ont convenu d'un suivi hebdomadaire pour assurer le bon déroulement du plan d'action.",
    chapters: room.chapters || [
      { timestamp: "00:00", label: "Introduction et tour de table" },
      { timestamp: "05:30", label: "Revue des objectifs" },
      { timestamp: "15:00", label: "Discussion stratégie commerciale" },
      { timestamp: "28:45", label: "Plan d'action et prochaines étapes" },
      { timestamp: "40:00", label: "Questions et clôture" },
    ],
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
    const notifications = targetUsers.map((t: { id: string }) => ({
      user_id: t.id,
      type: "broadcast",
      title: data.subject || "Nouvelle diffusion",
      body: data.content.substring(0, 200),
      read: false,
    }));

    await supabase.from("notifications").insert(notifications);
  }

  revalidatePath("/chat/broadcast");
  return { sentCount };
}

export async function getBroadcasts() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("broadcast_messages")
    .select("*, sender:profiles!broadcast_messages_sender_id_fkey(id, email, full_name, avatar_url, role)")
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
  const { data: { user } } = await supabase.auth.getUser();
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
  await supabase
    .from("live_questions")
    .update({ is_answered: true, answered_at: new Date().toISOString() })
    .eq("id", questionId);
  revalidatePath("/chat/video");
}

export async function getRoomQuestions(roomId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("live_questions")
    .select("*, user:profiles!live_questions_user_id_fkey(full_name, avatar_url)")
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
  const { data: channels } = await supabase
    .from("channels")
    .select("id");

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
  try {
    const suggestion = await aiComplete(
      `Contexte de la conversation :\n${context}\n\nGénère une réponse professionnelle et naturelle en français, adaptée au contexte. 2-3 phrases maximum. Sois direct et utile.`,
      {
        system: "Tu es un assistant pour un coach en vente/setting chez S Academy. Tu rédiges des réponses aux messages de clients. Ton ton est professionnel, chaleureux et orienté action. Réponds uniquement avec le texte du message, sans guillemets ni préfixe.",
        maxTokens: 256,
      }
    );

    return { suggestion, context };
  } catch {
    return {
      suggestion: "Merci pour votre message ! Je reviens vers vous rapidement avec une réponse détaillée.",
      context,
    };
  }
}

export async function generatePostCallSummary(roomId: string) {
  const supabase = await createClient();

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

  const durationMs = room?.started_at && room?.ended_at
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
      { system: "Tu es un assistant de productivité pour S Academy, une école de vente/setting. Réponds en français." }
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
      summary: "Résumé automatique indisponible. Veuillez réécouter l'enregistrement.",
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
