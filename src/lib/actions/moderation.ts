"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ModerationSettings {
  id?: string;
  blocked_words: string[];
  flood_limit: number;
  auto_delete_links: boolean;
  profanity_filter: boolean;
}

export interface ReportedMessage {
  id: string;
  message_id: string;
  channel_id: string;
  channel_name: string;
  author_id: string;
  author_name: string;
  author_email: string;
  reporter_id: string;
  reporter_name: string;
  content: string;
  reason: string;
  status: "pending" | "reviewed" | "resolved" | "dismissed";
  priority: "low" | "medium" | "high" | "critical";
  created_at: string;
}

export interface ModerationAction {
  id: string;
  moderator_id: string;
  moderator_name: string;
  target_user_id: string | null;
  target_user_name: string | null;
  action_type: string;
  details: string;
  created_at: string;
}

export interface ModeratedUser {
  id: string;
  full_name: string | null;
  email: string;
  role: string;
  avatar_url: string | null;
  status: "actif" | "mute" | "banni" | "restreint";
  muted_until?: string | null;
  banned_until?: string | null;
  ban_reason?: string | null;
  restriction_level?: string | null;
  warning_count: number;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_SETTINGS: ModerationSettings = {
  blocked_words: [],
  flood_limit: 10,
  auto_delete_links: false,
  profanity_filter: false,
};

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export async function getModerationSettings(): Promise<ModerationSettings> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifie");

  // Get auto_moderation settings
  const { data, error } = await supabase
    .from("moderation_settings")
    .select("*")
    .eq("setting_key", "auto_moderation")
    .single();

  if (error) {
    console.error("Error fetching moderation settings:", error);
    return { ...DEFAULT_SETTINGS };
  }

  if (data) {
    const value = data.setting_value as Record<string, unknown>;
    return {
      id: data.id,
      blocked_words: (value.blocked_words as string[]) || [],
      flood_limit: (value.flood_limit as number) ?? 10,
      auto_delete_links: (value.link_filter as boolean) ?? false,
      profanity_filter: (value.profanity_filter as boolean) ?? false,
    };
  }

  return { ...DEFAULT_SETTINGS };
}

export async function updateModerationSettings(
  settings: ModerationSettings
): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifie");

  const settingValue = {
    enabled: true,
    blocked_words: settings.blocked_words,
    flood_limit: settings.flood_limit,
    link_filter: settings.auto_delete_links,
    profanity_filter: settings.profanity_filter,
    spam_filter: true,
  };

  const { error } = await supabase
    .from("moderation_settings")
    .upsert({
      setting_key: "auto_moderation",
      setting_value: settingValue,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    }, { onConflict: "setting_key" });

  if (error) {
    console.error("Error updating moderation settings:", error);
    throw new Error("Erreur lors de la mise a jour des parametres");
  }

  await logModerationAction(user.id, "settings_update", "report", "settings", "Parametres de moderation mis a jour");
  revalidatePath("/chat/moderation");
}

// ---------------------------------------------------------------------------
// Reported Messages
// ---------------------------------------------------------------------------

export async function getReportedMessages(): Promise<ReportedMessage[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifie");

  const { data, error } = await supabase
    .from("reported_messages")
    .select(`
      id,
      message_id,
      channel_id,
      content,
      reason,
      status,
      priority,
      created_at,
      author_id,
      author_name,
      reporter_id
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching reported messages:", error);
    return [];
  }

  if (!data) return [];

  // Fetch reporter names
  const reporterIds = [...new Set(data.map(r => r.reporter_id).filter(Boolean))];
  const { data: reporters } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", reporterIds);

  const reporterMap = new Map((reporters || []).map(r => [r.id, r.full_name]));

  // Fetch channel names
  const channelIds = [...new Set(data.map(r => r.channel_id).filter(Boolean))];
  const { data: channels } = await supabase
    .from("channels")
    .select("id, name")
    .in("id", channelIds);

  const channelMap = new Map((channels || []).map(c => [c.id, c.name]));

  // Fetch author emails
  const authorIds = [...new Set(data.map(r => r.author_id).filter(Boolean))];
  const { data: authors } = await supabase
    .from("profiles")
    .select("id, email")
    .in("id", authorIds);

  const authorEmailMap = new Map((authors || []).map(a => [a.id, a.email]));

  return data.map((r) => ({
    id: r.id,
    message_id: r.message_id,
    channel_id: r.channel_id || "",
    channel_name: channelMap.get(r.channel_id) || "Canal inconnu",
    author_id: r.author_id || "",
    author_name: r.author_name || "Utilisateur",
    author_email: authorEmailMap.get(r.author_id) || "",
    reporter_id: r.reporter_id || "",
    reporter_name: reporterMap.get(r.reporter_id) || "Anonyme",
    content: r.content,
    reason: r.reason,
    status: r.status as ReportedMessage["status"],
    priority: r.priority as ReportedMessage["priority"],
    created_at: r.created_at,
  }));
}

export async function reportMessage(data: {
  messageId: string;
  channelId?: string;
  threadId?: string;
  authorId?: string;
  authorName?: string;
  content: string;
  reason: "spam" | "harassment" | "inappropriate" | "misinformation" | "other";
  description?: string;
}): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifie");

  const { error } = await supabase
    .from("reported_messages")
    .insert({
      message_id: data.messageId,
      channel_id: data.channelId || null,
      thread_id: data.threadId || null,
      reporter_id: user.id,
      author_id: data.authorId || null,
      author_name: data.authorName || null,
      content: data.content,
      reason: data.reason,
      description: data.description || null,
      status: "pending",
      priority: data.reason === "harassment" ? "high" : "medium",
    });

  if (error) {
    console.error("Error reporting message:", error);
    throw new Error("Erreur lors du signalement");
  }

  revalidatePath("/chat/moderation");
}

export async function moderateMessage(
  reportId: string,
  action: "resolve" | "dismiss" | "review",
  resolution?: string
): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifie");

  const statusMap = {
    resolve: "resolved",
    dismiss: "dismissed",
    review: "reviewed",
  } as const;

  // Get report details for logging
  const { data: report } = await supabase
    .from("reported_messages")
    .select("message_id, author_id")
    .eq("id", reportId)
    .single();

  const { error } = await supabase
    .from("reported_messages")
    .update({
      status: statusMap[action],
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      resolution: resolution || null,
    })
    .eq("id", reportId);

  if (error) {
    console.error("Error moderating message:", error);
    throw new Error("Erreur lors de la moderation");
  }

  // If resolving with deletion, soft-delete the original message
  if (action === "resolve" && resolution === "deleted" && report?.message_id) {
    await supabase
      .from("messages")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", report.message_id);
  }

  const actionLabels = {
    resolve: "Signalement resolu",
    dismiss: "Signalement rejete",
    review: "Signalement en revue",
  };

  await logModerationAction(
    user.id,
    action,
    "report",
    reportId,
    actionLabels[action]
  );
  revalidatePath("/chat/moderation");
}

// ---------------------------------------------------------------------------
// User Moderation (Mute / Ban / Restrict)
// ---------------------------------------------------------------------------

export async function getModeratedUsers(): Promise<ModeratedUser[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifie");

  // Fetch all non-admin profiles
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, avatar_url")
    .neq("role", "admin")
    .order("full_name", { ascending: true });

  if (profilesError) {
    console.error("Error fetching profiles:", profilesError);
    return [];
  }

  if (!profiles) return [];

  // Fetch moderation status for all users
  const userIds = profiles.map(p => p.id);
  const { data: statuses } = await supabase
    .from("user_moderation_status")
    .select("*")
    .in("user_id", userIds);

  const statusMap = new Map((statuses || []).map(s => [s.user_id, s]));

  // Fetch active ban reasons
  const { data: banActions } = await supabase
    .from("moderation_actions")
    .select("user_id, reason")
    .eq("action_type", "ban")
    .eq("is_active", true)
    .in("user_id", userIds);

  const banReasonMap = new Map((banActions || []).map(b => [b.user_id, b.reason]));

  return profiles.map((p) => {
    const status = statusMap.get(p.id);
    let userStatus: ModeratedUser["status"] = "actif";

    if (status) {
      if (status.is_banned && (!status.banned_until || new Date(status.banned_until) > new Date())) {
        userStatus = "banni";
      } else if (status.is_muted && (!status.muted_until || new Date(status.muted_until) > new Date())) {
        userStatus = "mute";
      } else if (status.is_restricted) {
        userStatus = "restreint";
      }
    }

    return {
      id: p.id,
      full_name: p.full_name,
      email: p.email,
      role: p.role,
      avatar_url: p.avatar_url,
      status: userStatus,
      muted_until: status?.muted_until || null,
      banned_until: status?.banned_until || null,
      ban_reason: userStatus === "banni" ? (banReasonMap.get(p.id) || null) : null,
      restriction_level: status?.restriction_level || null,
      warning_count: status?.warning_count || 0,
    };
  });
}

export async function muteUser(
  userId: string,
  durationHours: number,
  reason: string
): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifie");

  const mutedUntil = new Date(Date.now() + durationHours * 3600_000).toISOString();

  // Update or create moderation status
  const { error: statusError } = await supabase
    .from("user_moderation_status")
    .upsert({
      user_id: userId,
      is_muted: true,
      muted_until: mutedUntil,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

  if (statusError) {
    console.error("Error updating moderation status:", statusError);
    throw new Error("Erreur lors du mute");
  }

  // Record action
  const { error: actionError } = await supabase
    .from("moderation_actions")
    .insert({
      user_id: userId,
      action_type: "mute",
      reason: reason,
      duration_hours: durationHours,
      expires_at: mutedUntil,
      is_active: true,
      created_by: user.id,
    });

  if (actionError) {
    console.error("Error recording moderation action:", actionError);
  }

  await logModerationAction(
    user.id,
    "mute",
    "user",
    userId,
    `Utilisateur mute pour ${durationHours}h: ${reason}`
  );
  revalidatePath("/chat/moderation");
}

export async function unmuteUser(userId: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifie");

  // Update moderation status
  const { error: statusError } = await supabase
    .from("user_moderation_status")
    .update({
      is_muted: false,
      muted_until: null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (statusError) {
    console.error("Error updating moderation status:", statusError);
    throw new Error("Erreur lors du demute");
  }

  // Deactivate mute actions
  await supabase
    .from("moderation_actions")
    .update({ is_active: false, revoked_at: new Date().toISOString(), revoked_by: user.id })
    .eq("user_id", userId)
    .eq("action_type", "mute")
    .eq("is_active", true);

  // Record unmute action
  await supabase
    .from("moderation_actions")
    .insert({
      user_id: userId,
      action_type: "unmute",
      reason: "Demute manuel",
      is_active: false,
      created_by: user.id,
    });

  await logModerationAction(user.id, "unmute", "user", userId, "Utilisateur demute");
  revalidatePath("/chat/moderation");
}

export async function banUser(
  userId: string,
  reason: string,
  durationHours?: number
): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifie");

  const bannedUntil = durationHours
    ? new Date(Date.now() + durationHours * 3600_000).toISOString()
    : null;

  // Update moderation status
  const { error: statusError } = await supabase
    .from("user_moderation_status")
    .upsert({
      user_id: userId,
      is_banned: true,
      banned_until: bannedUntil,
      is_muted: false,
      muted_until: null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

  if (statusError) {
    console.error("Error updating moderation status:", statusError);
    throw new Error("Erreur lors du ban");
  }

  // Record action
  const { error: actionError } = await supabase
    .from("moderation_actions")
    .insert({
      user_id: userId,
      action_type: "ban",
      reason: reason,
      duration_hours: durationHours || null,
      expires_at: bannedUntil,
      is_active: true,
      created_by: user.id,
    });

  if (actionError) {
    console.error("Error recording moderation action:", actionError);
  }

  const durationText = durationHours ? `pour ${durationHours}h` : "definitivement";
  await logModerationAction(
    user.id,
    "ban",
    "user",
    userId,
    `Utilisateur banni ${durationText}: ${reason}`
  );
  revalidatePath("/chat/moderation");
}

export async function unbanUser(userId: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifie");

  // Update moderation status
  const { error: statusError } = await supabase
    .from("user_moderation_status")
    .update({
      is_banned: false,
      banned_until: null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (statusError) {
    console.error("Error updating moderation status:", statusError);
    throw new Error("Erreur lors du deban");
  }

  // Deactivate ban actions
  await supabase
    .from("moderation_actions")
    .update({ is_active: false, revoked_at: new Date().toISOString(), revoked_by: user.id })
    .eq("user_id", userId)
    .eq("action_type", "ban")
    .eq("is_active", true);

  // Record unban action
  await supabase
    .from("moderation_actions")
    .insert({
      user_id: userId,
      action_type: "unban",
      reason: "Deban manuel",
      is_active: false,
      created_by: user.id,
    });

  await logModerationAction(user.id, "unban", "user", userId, "Utilisateur debanni");
  revalidatePath("/chat/moderation");
}

export async function warnUser(userId: string, reason: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifie");

  // Increment warning count
  const { data: currentStatus } = await supabase
    .from("user_moderation_status")
    .select("warning_count")
    .eq("user_id", userId)
    .single();

  const newWarningCount = (currentStatus?.warning_count || 0) + 1;

  const { error: statusError } = await supabase
    .from("user_moderation_status")
    .upsert({
      user_id: userId,
      warning_count: newWarningCount,
      last_warning_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

  if (statusError) {
    console.error("Error updating warning count:", statusError);
    throw new Error("Erreur lors de l'avertissement");
  }

  // Record action
  await supabase
    .from("moderation_actions")
    .insert({
      user_id: userId,
      action_type: "warn",
      reason: reason,
      is_active: false,
      created_by: user.id,
    });

  await logModerationAction(
    user.id,
    "warn",
    "user",
    userId,
    `Avertissement #${newWarningCount}: ${reason}`
  );
  revalidatePath("/chat/moderation");
}

export async function restrictUser(
  userId: string,
  level: "limited" | "read_only",
  reason: string
): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifie");

  const { error: statusError } = await supabase
    .from("user_moderation_status")
    .upsert({
      user_id: userId,
      is_restricted: true,
      restriction_level: level,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

  if (statusError) {
    console.error("Error restricting user:", statusError);
    throw new Error("Erreur lors de la restriction");
  }

  await supabase
    .from("moderation_actions")
    .insert({
      user_id: userId,
      action_type: "restrict",
      reason: reason,
      is_active: true,
      created_by: user.id,
    });

  const levelText = level === "read_only" ? "lecture seule" : "limite";
  await logModerationAction(
    user.id,
    "restrict",
    "user",
    userId,
    `Utilisateur restreint (${levelText}): ${reason}`
  );
  revalidatePath("/chat/moderation");
}

// ---------------------------------------------------------------------------
// Moderation Log
// ---------------------------------------------------------------------------

async function logModerationAction(
  performedBy: string,
  actionType: string,
  targetType: "user" | "message" | "thread" | "channel" | "report",
  targetId: string,
  details: string
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("moderation_log")
    .insert({
      action_type: actionType,
      target_type: targetType,
      target_id: targetId,
      details: { description: details },
      performed_by: performedBy,
    });

  if (error) {
    console.error("Error logging moderation action:", error);
  }
}

export async function getModerationLog(): Promise<ModerationAction[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifie");

  const { data, error } = await supabase
    .from("moderation_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("Error fetching moderation log:", error);
    return [];
  }

  if (!data) return [];

  // Fetch performer names
  const performerIds = [...new Set(data.map(d => d.performed_by).filter(Boolean))];
  const { data: performers } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", performerIds);

  const performerMap = new Map((performers || []).map(p => [p.id, p.full_name]));

  // Fetch target user names where applicable
  const targetUserIds = data
    .filter(d => d.target_type === "user")
    .map(d => d.target_id);

  const { data: targetUsers } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", targetUserIds);

  const targetUserMap = new Map((targetUsers || []).map(t => [t.id, t.full_name]));

  return data.map((row) => {
    const details = row.details as Record<string, unknown> | null;
    return {
      id: row.id,
      moderator_id: row.performed_by,
      moderator_name: performerMap.get(row.performed_by) || "Systeme",
      target_user_id: row.target_type === "user" ? row.target_id : null,
      target_user_name: row.target_type === "user" ? (targetUserMap.get(row.target_id) || null) : null,
      action_type: row.action_type,
      details: (details?.description as string) || "",
      created_at: row.created_at,
    };
  });
}

// ---------------------------------------------------------------------------
// Banned Words
// ---------------------------------------------------------------------------

export async function getBannedWords(): Promise<Array<{ id: string; word: string; severity: string }>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifie");

  const { data, error } = await supabase
    .from("banned_words")
    .select("id, word, severity")
    .eq("is_active", true)
    .order("word");

  if (error) {
    console.error("Error fetching banned words:", error);
    return [];
  }

  return data || [];
}

export async function addBannedWord(
  word: string,
  severity: "low" | "medium" | "high" = "medium"
): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifie");

  const { error } = await supabase
    .from("banned_words")
    .insert({
      word: word.toLowerCase().trim(),
      severity,
      created_by: user.id,
    });

  if (error) {
    console.error("Error adding banned word:", error);
    throw new Error("Erreur lors de l'ajout du mot");
  }

  revalidatePath("/chat/moderation");
}

export async function removeBannedWord(wordId: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifie");

  const { error } = await supabase
    .from("banned_words")
    .update({ is_active: false })
    .eq("id", wordId);

  if (error) {
    console.error("Error removing banned word:", error);
    throw new Error("Erreur lors de la suppression du mot");
  }

  revalidatePath("/chat/moderation");
}

// ---------------------------------------------------------------------------
// User Status Check
// ---------------------------------------------------------------------------

export async function checkUserCanPost(userId: string): Promise<{
  canPost: boolean;
  reason?: string;
}> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("user_moderation_status")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (!data) {
    return { canPost: true };
  }

  if (data.is_banned) {
    if (!data.banned_until || new Date(data.banned_until) > new Date()) {
      return {
        canPost: false,
        reason: data.banned_until
          ? `Banni jusqu'au ${new Date(data.banned_until).toLocaleDateString("fr-FR")}`
          : "Banni definitivement",
      };
    }
  }

  if (data.is_muted) {
    if (!data.muted_until || new Date(data.muted_until) > new Date()) {
      return {
        canPost: false,
        reason: data.muted_until
          ? `Mute jusqu'au ${new Date(data.muted_until).toLocaleString("fr-FR")}`
          : "Mute",
      };
    }
  }

  if (data.is_restricted && data.restriction_level === "read_only") {
    return {
      canPost: false,
      reason: "Compte en lecture seule",
    };
  }

  return { canPost: true };
}
