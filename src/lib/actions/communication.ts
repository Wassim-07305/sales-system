"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

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
  scheduledAt: string;
  maxParticipants?: number;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const { error } = await supabase.from("video_rooms").insert({
    title: data.title,
    host_id: user.id,
    status: "scheduled",
    scheduled_at: data.scheduledAt,
    max_participants: data.maxParticipants || 10,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/chat/video");
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
  // Stub: In a real app this would fetch from storage / transcription service
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
// AI Features
// ---------------------------------------------------------------------------

export async function generateAiReply(context: string) {
  const { isAiConfigured } = await import("@/lib/ai/client");
  const fallbackSuggestion = "Merci pour votre message ! Je serais ravi d'en discuter plus en détail lors de notre prochain appel.";

  if (!isAiConfigured()) {
    return { suggestion: fallbackSuggestion, context };
  }

  try {
    const { complete } = await import("@/lib/ai/utils");
    const { REPLY_SUGGESTION_SYSTEM_PROMPT } = await import("@/lib/ai/prompts");

    const suggestion = await complete({
      system: REPLY_SUGGESTION_SYSTEM_PROMPT,
      user: `Génère une réponse professionnelle et pertinente pour ce contexte :\n\n${context}`,
      model: "HAIKU",
      maxTokens: 512,
    });

    return { suggestion, context };
  } catch {
    return { suggestion: fallbackSuggestion, context };
  }
}

export async function generatePostCallSummary(roomId: string) {
  const { isAiConfigured } = await import("@/lib/ai/client");
  const fallback = {
    roomId,
    summary: "Points clés abordés :\n• Revue des performances commerciales du mois\n• Discussion sur les nouvelles cibles B2B\n• Planification des actions pour le trimestre prochain\n\nActions à suivre :\n1. Préparer le rapport mensuel\n2. Contacter les prospects prioritaires\n3. Mettre à jour le pipeline CRM",
    sentiment: "positif" as const,
    duration: "N/A",
    keyTopics: ["Performance commerciale", "Cibles B2B", "Plan trimestriel"],
  };

  if (!isAiConfigured()) return fallback;

  try {
    const supabase = await createClient();
    const { data: room } = await supabase
      .from("video_rooms")
      .select("title, description, started_at, ended_at")
      .eq("id", roomId)
      .single();

    if (!room) return fallback;

    const duration = room.started_at && room.ended_at
      ? `${Math.round((new Date(room.ended_at).getTime() - new Date(room.started_at).getTime()) / 60000)} minutes`
      : "N/A";

    const { completeJSON } = await import("@/lib/ai/utils");
    const { CALL_SUMMARY_SYSTEM_PROMPT } = await import("@/lib/ai/prompts");

    const result = await completeJSON<{
      summary: string;
      sentiment: string;
      duration: string;
      keyTopics: string[];
    }>({
      system: CALL_SUMMARY_SYSTEM_PROMPT,
      user: `Génère un résumé pour cette visioconférence :\n\nTitre : ${room.title || "Appel de groupe"}\nDescription : ${room.description || "N/A"}\nDurée : ${duration}\n\nGénère un résumé structuré avec les points clés probables basés sur le contexte.`,
      model: "SONNET",
      maxTokens: 1024,
      fallback: { summary: fallback.summary, sentiment: "positif", duration, keyTopics: fallback.keyTopics },
    });

    return { roomId, ...result };
  } catch {
    return fallback;
  }
}
