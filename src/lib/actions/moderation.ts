"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ModerationSettings {
  id?: string;
  blocked_words: string[];
  flood_limit: number; // max messages per minute
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
  status: "pending" | "approved" | "deleted" | "warned";
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
  status: "actif" | "muté" | "banni";
  muted_until?: string | null;
  muted_channel_id?: string | null;
  ban_reason?: string | null;
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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  try {
    const { data } = await supabase
      .from("moderation_settings")
      .select("*")
      .limit(1)
      .single();

    if (data) {
      return {
        id: data.id,
        blocked_words: data.blocked_words || [],
        flood_limit: data.flood_limit ?? 10,
        auto_delete_links: data.auto_delete_links ?? false,
        profanity_filter: data.profanity_filter ?? false,
      };
    }
  } catch {
    // Table may not exist yet – return defaults
  }

  return { ...DEFAULT_SETTINGS };
}

export async function updateModerationSettings(
  settings: ModerationSettings
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const payload = {
    blocked_words: settings.blocked_words,
    flood_limit: settings.flood_limit,
    auto_delete_links: settings.auto_delete_links,
    profanity_filter: settings.profanity_filter,
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  };

  try {
    if (settings.id) {
      await supabase
        .from("moderation_settings")
        .update(payload)
        .eq("id", settings.id);
    } else {
      await supabase.from("moderation_settings").insert(payload);
    }
  } catch {
    // Table may not exist – swallow and log moderation action
  }

  await logModerationAction(user.id, null, "settings_update", "Paramètres de modération mis à jour");
  revalidatePath("/chat/moderation");
}

// ---------------------------------------------------------------------------
// Reported Messages
// ---------------------------------------------------------------------------

export async function getReportedMessages(): Promise<ReportedMessage[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  try {
    const { data } = await supabase
      .from("reported_messages")
      .select(
        `
        id,
        message_id,
        channel_id,
        reason,
        status,
        created_at,
        author:profiles!reported_messages_author_id_fkey(id, full_name, email),
        reporter:profiles!reported_messages_reporter_id_fkey(id, full_name),
        channel:channels!reported_messages_channel_id_fkey(name)
      `
      )
      .order("created_at", { ascending: false });

    if (data) {
      return data.map((r: Record<string, unknown>) => {
        const author = Array.isArray(r.author) ? r.author[0] : r.author;
        const reporter = Array.isArray(r.reporter)
          ? r.reporter[0]
          : r.reporter;
        const channel = Array.isArray(r.channel) ? r.channel[0] : r.channel;

        return {
          id: r.id as string,
          message_id: r.message_id as string,
          channel_id: r.channel_id as string,
          channel_name:
            (channel as Record<string, unknown>)?.name as string || "Inconnu",
          author_id: (author as Record<string, unknown>)?.id as string || "",
          author_name:
            ((author as Record<string, unknown>)?.full_name as string) ||
            "Utilisateur",
          author_email:
            ((author as Record<string, unknown>)?.email as string) || "",
          reporter_id:
            (reporter as Record<string, unknown>)?.id as string || "",
          reporter_name:
            ((reporter as Record<string, unknown>)?.full_name as string) ||
            "Anonyme",
          content: (r as Record<string, unknown>).content as string || "",
          reason: r.reason as string,
          status: r.status as ReportedMessage["status"],
          created_at: r.created_at as string,
        };
      });
    }
  } catch {
    // Table may not exist – return mock data for UI development
  }

  // Fallback mock data so the UI is usable before tables exist
  return [
    {
      id: "mock-1",
      message_id: "msg-1",
      channel_id: "ch-1",
      channel_name: "Général",
      author_id: "u-1",
      author_name: "Jean Dupont",
      author_email: "jean@example.com",
      reporter_id: "u-2",
      reporter_name: "Marie Martin",
      content: "Contenu signalé exemple – spam répétitif",
      reason: "Spam",
      status: "pending",
      created_at: new Date().toISOString(),
    },
    {
      id: "mock-2",
      message_id: "msg-2",
      channel_id: "ch-2",
      channel_name: "Ventes",
      author_id: "u-3",
      author_name: "Pierre Leroy",
      author_email: "pierre@example.com",
      reporter_id: "u-4",
      reporter_name: "Sophie Bernard",
      content: "Langage inapproprié dans le canal de ventes",
      reason: "Langage inapproprié",
      status: "pending",
      created_at: new Date(Date.now() - 3600_000).toISOString(),
    },
  ];
}

export async function moderateMessage(
  messageId: string,
  action: "approve" | "delete" | "warn"
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const statusMap = {
    approve: "approved",
    delete: "deleted",
    warn: "warned",
  } as const;

  try {
    await supabase
      .from("reported_messages")
      .update({ status: statusMap[action], moderated_by: user.id, moderated_at: new Date().toISOString() })
      .eq("id", messageId);

    if (action === "delete") {
      // Also soft-delete the original message
      const { data: report } = await supabase
        .from("reported_messages")
        .select("message_id")
        .eq("id", messageId)
        .single();

      if (report) {
        await supabase
          .from("messages")
          .update({ deleted_at: new Date().toISOString() })
          .eq("id", report.message_id);
      }
    }
  } catch {
    // Table may not exist
  }

  const actionLabels = {
    approve: "Message approuvé",
    delete: "Message supprimé",
    warn: "Avertissement envoyé",
  };

  await logModerationAction(user.id, null, `message_${action}`, actionLabels[action]);
  revalidatePath("/chat/moderation");
}

// ---------------------------------------------------------------------------
// User Moderation (Mute / Ban)
// ---------------------------------------------------------------------------

export async function getModeratedUsers(): Promise<ModeratedUser[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  // Fetch all non-admin profiles
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, avatar_url")
    .neq("role", "admin")
    .order("full_name", { ascending: true });

  if (!profiles) return [];

  // Try to fetch active mutes/bans
  const mutes: Record<string, { until: string | null; channel_id: string | null }> = {};
  const bans: Record<string, string> = {};

  try {
    const { data: muteData } = await supabase
      .from("moderation_actions")
      .select("target_user_id, details, created_at")
      .eq("action_type", "mute")
      .gt("details", ""); // has expiry info

    if (muteData) {
      for (const m of muteData) {
        // Extract muted_until from details JSON
        try {
          const parsed = JSON.parse(m.details);
          if (parsed.until && new Date(parsed.until) > new Date()) {
            mutes[m.target_user_id] = {
              until: parsed.until,
              channel_id: parsed.channel_id || null,
            };
          }
        } catch {
          // not JSON – skip
        }
      }
    }

    const { data: banData } = await supabase
      .from("moderation_actions")
      .select("target_user_id, details")
      .eq("action_type", "ban");

    // Check for unbans
    const { data: unbanData } = await supabase
      .from("moderation_actions")
      .select("target_user_id")
      .eq("action_type", "unban");

    const unbannedIds = new Set((unbanData || []).map((u: { target_user_id: string }) => u.target_user_id));

    if (banData) {
      for (const b of banData) {
        if (!unbannedIds.has(b.target_user_id)) {
          try {
            const parsed = JSON.parse(b.details);
            bans[b.target_user_id] = parsed.reason || "Banni";
          } catch {
            bans[b.target_user_id] = b.details || "Banni";
          }
        }
      }
    }
  } catch {
    // Table may not exist
  }

  return profiles.map((p) => {
    let status: ModeratedUser["status"] = "actif";
    let muted_until: string | null = null;
    let muted_channel_id: string | null = null;
    let ban_reason: string | null = null;

    if (bans[p.id]) {
      status = "banni";
      ban_reason = bans[p.id];
    } else if (mutes[p.id]) {
      status = "muté";
      muted_until = mutes[p.id].until;
      muted_channel_id = mutes[p.id].channel_id;
    }

    return {
      id: p.id,
      full_name: p.full_name,
      email: p.email,
      role: p.role,
      avatar_url: p.avatar_url,
      status,
      muted_until,
      muted_channel_id,
      ban_reason,
    };
  });
}

export async function muteUser(
  userId: string,
  channelId: string,
  duration: number
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const until = new Date(Date.now() + duration * 60_000).toISOString();

  try {
    await supabase.from("moderation_actions").insert({
      moderator_id: user.id,
      target_user_id: userId,
      action_type: "mute",
      details: JSON.stringify({ channel_id: channelId, duration, until }),
      created_at: new Date().toISOString(),
    });
  } catch {
    // Table may not exist
  }

  await logModerationAction(
    user.id,
    userId,
    "mute",
    `Utilisateur muté pour ${duration} minutes`
  );
  revalidatePath("/chat/moderation");
}

export async function unmuteUser(
  userId: string,
  channelId: string
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  try {
    // Remove active mute by inserting an unmute action
    await supabase.from("moderation_actions").insert({
      moderator_id: user.id,
      target_user_id: userId,
      action_type: "unmute",
      details: JSON.stringify({ channel_id: channelId }),
      created_at: new Date().toISOString(),
    });

    // Delete the mute record
    await supabase
      .from("moderation_actions")
      .delete()
      .eq("target_user_id", userId)
      .eq("action_type", "mute");
  } catch {
    // Table may not exist
  }

  await logModerationAction(user.id, userId, "unmute", "Utilisateur démuté");
  revalidatePath("/chat/moderation");
}

export async function banUser(userId: string, reason: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  try {
    await supabase.from("moderation_actions").insert({
      moderator_id: user.id,
      target_user_id: userId,
      action_type: "ban",
      details: JSON.stringify({ reason }),
      created_at: new Date().toISOString(),
    });
  } catch {
    // Table may not exist
  }

  await logModerationAction(
    user.id,
    userId,
    "ban",
    `Utilisateur banni : ${reason}`
  );
  revalidatePath("/chat/moderation");
}

export async function unbanUser(userId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  try {
    // Insert unban action
    await supabase.from("moderation_actions").insert({
      moderator_id: user.id,
      target_user_id: userId,
      action_type: "unban",
      details: JSON.stringify({}),
      created_at: new Date().toISOString(),
    });

    // Remove the ban record
    await supabase
      .from("moderation_actions")
      .delete()
      .eq("target_user_id", userId)
      .eq("action_type", "ban");
  } catch {
    // Table may not exist
  }

  await logModerationAction(user.id, userId, "unban", "Utilisateur débanni");
  revalidatePath("/chat/moderation");
}

// ---------------------------------------------------------------------------
// Moderation Log
// ---------------------------------------------------------------------------

async function logModerationAction(
  moderatorId: string,
  targetUserId: string | null,
  actionType: string,
  details: string
): Promise<void> {
  const supabase = await createClient();

  try {
    await supabase.from("moderation_log").insert({
      moderator_id: moderatorId,
      target_user_id: targetUserId,
      action_type: actionType,
      details,
      created_at: new Date().toISOString(),
    });
  } catch {
    // Table may not exist – silently fail
  }
}

export async function getModerationLog(): Promise<ModerationAction[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  try {
    const { data } = await supabase
      .from("moderation_log")
      .select(
        `
        id,
        action_type,
        details,
        created_at,
        target_user_id,
        moderator:profiles!moderation_log_moderator_id_fkey(id, full_name),
        target:profiles!moderation_log_target_user_id_fkey(id, full_name)
      `
      )
      .order("created_at", { ascending: false })
      .limit(100);

    if (data) {
      return data.map((row: Record<string, unknown>) => {
        const mod = Array.isArray(row.moderator) ? row.moderator[0] : row.moderator;
        const target = Array.isArray(row.target) ? row.target[0] : row.target;

        return {
          id: row.id as string,
          moderator_id: (mod as Record<string, unknown>)?.id as string || "",
          moderator_name:
            ((mod as Record<string, unknown>)?.full_name as string) || "Système",
          target_user_id: row.target_user_id as string | null,
          target_user_name:
            ((target as Record<string, unknown>)?.full_name as string) || null,
          action_type: row.action_type as string,
          details: row.details as string,
          created_at: row.created_at as string,
        };
      });
    }
  } catch {
    // Table may not exist
  }

  return [];
}
