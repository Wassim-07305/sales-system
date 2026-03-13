"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// ---------------------------------------------------------------------------
// Instagram Graph API stubs
// All functions gracefully fall back when no API token is available.
// ---------------------------------------------------------------------------

const GRAPH_API_BASE = "https://graph.instagram.com/v21.0";

/** Resolve the Instagram access token: env var → user_settings row → null */
async function resolveToken(userId: string, supabase: Awaited<ReturnType<typeof createClient>>) {
  // 1. Env-level token (shared / app-wide)
  const envToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  if (envToken) return envToken;

  // 2. Per-user token stored in user_settings
  const { data } = await supabase
    .from("user_settings")
    .select("value")
    .eq("user_id", userId)
    .eq("key", "instagram_access_token")
    .single();

  return (data?.value as string) || null;
}

// ---------------------------------------------------------------------------
// connectInstagramAccount
// ---------------------------------------------------------------------------
export async function connectInstagramAccount(accessToken: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  if (!accessToken?.trim()) {
    return { error: "Le token d'accès est requis" };
  }

  // Validate token against the Graph API
  try {
    const res = await fetch(`${GRAPH_API_BASE}/me?fields=id,username&access_token=${accessToken}`);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return {
        error: `Token invalide : ${(body as Record<string, unknown>).error || res.statusText}`,
      };
    }

    const profile = (await res.json()) as { id: string; username: string };

    // Upsert the token in user_settings
    const { data: existing } = await supabase
      .from("user_settings")
      .select("id")
      .eq("user_id", user.id)
      .eq("key", "instagram_access_token")
      .single();

    if (existing) {
      await supabase
        .from("user_settings")
        .update({ value: accessToken })
        .eq("id", existing.id);
    } else {
      await supabase.from("user_settings").insert({
        user_id: user.id,
        key: "instagram_access_token",
        value: accessToken,
      });
    }

    // Store the Instagram username for reference
    const { data: existingUsername } = await supabase
      .from("user_settings")
      .select("id")
      .eq("user_id", user.id)
      .eq("key", "instagram_username")
      .single();

    if (existingUsername) {
      await supabase
        .from("user_settings")
        .update({ value: profile.username })
        .eq("id", existingUsername.id);
    } else {
      await supabase.from("user_settings").insert({
        user_id: user.id,
        key: "instagram_username",
        value: profile.username,
      });
    }

    revalidatePath("/prospecting/instagram");
    return { data: { id: profile.id, username: profile.username } };
  } catch (err) {
    console.error("Instagram connect error:", err);
    return { error: "Impossible de valider le token Instagram" };
  }
}

// ---------------------------------------------------------------------------
// getInstagramProfile
// ---------------------------------------------------------------------------
export async function getInstagramProfile(username: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  if (!username?.trim()) {
    return { error: "Le nom d'utilisateur est requis" };
  }

  const token = await resolveToken(user.id, supabase);

  // --- Live API path ---
  if (token) {
    try {
      // The Instagram Graph API requires the user's IG User ID for business discovery.
      const res = await fetch(
        `${GRAPH_API_BASE}/me?fields=business_discovery.fields(username,name,biography,follows_count,followers_count,media_count,profile_picture_url).username(${encodeURIComponent(username)})&access_token=${token}`
      );

      if (res.ok) {
        const json = (await res.json()) as Record<string, unknown>;
        const discovery = json.business_discovery as Record<string, unknown> | undefined;
        if (discovery) {
          return {
            data: {
              username: discovery.username as string,
              name: discovery.name as string,
              biography: discovery.biography as string,
              followers_count: discovery.followers_count as number,
              follows_count: discovery.follows_count as number,
              media_count: discovery.media_count as number,
              profile_picture_url: discovery.profile_picture_url as string,
              source: "instagram_api" as const,
            },
          };
        }
      }

      // If business_discovery fails, fall through to stub
      console.warn("Instagram business_discovery failed, using fallback");
    } catch (err) {
      console.error("Instagram profile fetch error:", err);
    }
  }

  // --- Fallback: check local prospects table ---
  const { data: prospect } = await supabase
    .from("prospects")
    .select("id, name, profile_url, platform, status, instagram_id")
    .eq("platform", "instagram")
    .ilike("name", `%${username}%`)
    .limit(1)
    .single();

  if (prospect) {
    return {
      data: {
        username,
        name: prospect.name,
        biography: null,
        followers_count: null,
        follows_count: null,
        media_count: null,
        profile_picture_url: null,
        source: "local_database" as const,
      },
    };
  }

  return {
    data: {
      username,
      name: username,
      biography: null,
      followers_count: null,
      follows_count: null,
      media_count: null,
      profile_picture_url: null,
      source: "stub" as const,
    },
  };
}

// ---------------------------------------------------------------------------
// sendInstagramDM
// ---------------------------------------------------------------------------
export async function sendInstagramDM(recipientId: string, message: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  if (!recipientId?.trim() || !message?.trim()) {
    return { error: "Le destinataire et le message sont requis" };
  }

  const token = await resolveToken(user.id, supabase);
  const pageId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;

  let externalId: string | null = null;
  let status: "sent" | "queued" | "failed" = "queued";

  // --- Live API path (Instagram Messaging API via Pages) ---
  if (token && pageId) {
    try {
      const res = await fetch(
        `https://graph.facebook.com/v21.0/${pageId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            recipient: { id: recipientId },
            message: { text: message },
            messaging_type: "MESSAGE_TAG",
            tag: "HUMAN_AGENT",
          }),
        }
      );

      if (res.ok) {
        const json = (await res.json()) as { message_id?: string };
        externalId = json.message_id || null;
        status = "sent";
      } else {
        const errorBody = await res.json().catch(() => ({}));
        console.error("Instagram DM API error:", errorBody);
        status = "failed";
      }
    } catch (err) {
      console.error("Instagram DM send error:", err);
      status = "failed";
    }
  }

  // --- Queue locally regardless (for tracking) ---
  const prospectLookup = await supabase
    .from("prospects")
    .select("id")
    .eq("instagram_id", recipientId)
    .single();

  const prospectId = prospectLookup.data?.id || null;

  await supabase.from("inbox_messages").insert({
    user_id: user.id,
    prospect_id: prospectId,
    channel: "instagram",
    direction: "outbound",
    content: message,
    external_id: externalId,
    status,
    created_at: new Date().toISOString(),
  });

  revalidatePath("/inbox");
  revalidatePath("/prospecting/instagram");

  if (!token || !pageId) {
    return {
      data: { status: "queued", message_id: null },
      error:
        "API Instagram non configurée — message enregistré localement. Ajoutez INSTAGRAM_ACCESS_TOKEN et INSTAGRAM_BUSINESS_ACCOUNT_ID pour envoyer en direct.",
    };
  }

  if (status === "failed") {
    return { error: "Échec de l'envoi du DM Instagram" };
  }

  return { data: { status, message_id: externalId } };
}

// ---------------------------------------------------------------------------
// getInstagramConversations
// ---------------------------------------------------------------------------
export async function getInstagramConversations() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const token = await resolveToken(user.id, supabase);
  const pageId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;

  // --- Live API path ---
  if (token && pageId) {
    try {
      const res = await fetch(
        `https://graph.facebook.com/v21.0/${pageId}/conversations?platform=instagram&fields=participants,messages{message,from,created_time}&access_token=${token}`
      );

      if (res.ok) {
        const json = (await res.json()) as {
          data: Array<{
            id: string;
            participants: { data: Array<{ id: string; name: string }> };
            messages: { data: Array<{ id: string; message: string; from: { id: string; name: string }; created_time: string }> };
          }>;
        };

        const conversations = json.data.map((conv) => ({
          id: conv.id,
          participants: conv.participants.data,
          messages: conv.messages?.data || [],
          source: "instagram_api" as const,
        }));

        return { data: conversations };
      }

      console.warn("Instagram conversations API failed, using local fallback");
    } catch (err) {
      console.error("Instagram conversations fetch error:", err);
    }
  }

  // --- Fallback: local inbox_messages table ---
  const { data: messages } = await supabase
    .from("inbox_messages")
    .select("*, prospect:prospects(id, name, instagram_id, profile_url)")
    .eq("user_id", user.id)
    .eq("channel", "instagram")
    .order("created_at", { ascending: true });

  if (!messages || messages.length === 0) {
    if (!token || !pageId) {
      return {
        data: [],
        error:
          "API Instagram non configurée — affichage des conversations locales uniquement. Ajoutez INSTAGRAM_ACCESS_TOKEN et INSTAGRAM_BUSINESS_ACCOUNT_ID.",
      };
    }
    return { data: [] };
  }

  // Group by prospect_id
  const grouped: Record<
    string,
    {
      prospect_id: string;
      prospect: Record<string, unknown> | null;
      messages: typeof messages;
      last_message_at: string;
      unread_count: number;
    }
  > = {};

  for (const msg of messages) {
    const pid = msg.prospect_id || "unknown";
    if (!grouped[pid]) {
      const prospectData = Array.isArray(msg.prospect)
        ? msg.prospect[0] || null
        : msg.prospect;
      grouped[pid] = {
        prospect_id: pid,
        prospect: prospectData as Record<string, unknown> | null,
        messages: [],
        last_message_at: msg.created_at,
        unread_count: 0,
      };
    }
    grouped[pid].messages.push(msg);
    grouped[pid].last_message_at = msg.created_at;
    if (msg.direction === "inbound" && msg.status !== "read") {
      grouped[pid].unread_count += 1;
    }
  }

  const conversations = Object.values(grouped).sort(
    (a, b) =>
      new Date(b.last_message_at).getTime() -
      new Date(a.last_message_at).getTime()
  );

  return {
    data: conversations,
    ...(!token || !pageId
      ? {
          error:
            "API Instagram non configurée — affichage des conversations locales uniquement. Ajoutez INSTAGRAM_ACCESS_TOKEN et INSTAGRAM_BUSINESS_ACCOUNT_ID.",
        }
      : {}),
  };
}
