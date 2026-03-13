"use server";

import { createClient } from "@/lib/supabase/server";
import { getApiKey } from "@/lib/api-keys";
import { revalidatePath } from "next/cache";

export async function getWhatsAppConnection() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("whatsapp_connections")
    .select("*")
    .eq("user_id", user.id)
    .single();

  return data;
}

export async function connectWhatsApp(phoneNumber: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  // Check if connection already exists
  const { data: existing } = await supabase
    .from("whatsapp_connections")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (existing) {
    const { error } = await supabase
      .from("whatsapp_connections")
      .update({
        phone_number: phoneNumber,
        status: "pending",
        api_config: {},
      })
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("whatsapp_connections").insert({
      user_id: user.id,
      phone_number: phoneNumber,
      status: "pending",
      api_config: {},
    });
    if (error) throw new Error(error.message);
  }

  revalidatePath("/whatsapp");
  revalidatePath("/whatsapp/settings");
}

export async function disconnectWhatsApp() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const { error } = await supabase
    .from("whatsapp_connections")
    .update({ status: "disconnected", connected_at: null })
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
  revalidatePath("/whatsapp");
  revalidatePath("/whatsapp/settings");
}

export async function getConversations() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  // Get the user's connection
  const { data: connection } = await supabase
    .from("whatsapp_connections")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!connection) return [];

  const { data } = await supabase
    .from("whatsapp_messages")
    .select("*, prospect:prospects(id, name, profile_url, platform, status)")
    .eq("connection_id", connection.id)
    .order("created_at", { ascending: true });

  if (!data) return [];

  // Group messages by prospect_id
  const grouped: Record<
    string,
    {
      prospect_id: string;
      prospect: Record<string, unknown> | null;
      messages: typeof data;
      last_message_at: string;
      unread_count: number;
    }
  > = {};

  for (const msg of data) {
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
    if (msg.direction === "inbound" && msg.status === "delivered") {
      grouped[pid].unread_count += 1;
    }
  }

  return Object.values(grouped).sort(
    (a, b) =>
      new Date(b.last_message_at).getTime() -
      new Date(a.last_message_at).getTime()
  );
}

export async function sendWhatsAppMessage(data: {
  prospectId: string;
  content: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  // Get connection
  const { data: connection } = await supabase
    .from("whatsapp_connections")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!connection) throw new Error("Aucune connexion WhatsApp");

  // Récupérer le numéro du prospect
  const { data: prospect } = await supabase
    .from("prospects")
    .select("phone")
    .eq("id", data.prospectId)
    .single();

  let waMessageId: string | null = null;
  let status = "sent";

  // Envoyer via l'API WhatsApp Business si configurée
  const accessToken = await getApiKey("WHATSAPP_ACCESS_TOKEN");
  const phoneNumberId = await getApiKey("WHATSAPP_PHONE_NUMBER_ID");

  if (accessToken && phoneNumberId && prospect?.phone) {
    try {
      const response = await fetch(
        `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: prospect.phone.replace(/[^0-9]/g, ""),
            type: "text",
            text: { body: data.content },
          }),
        }
      );

      if (response.ok) {
        const result = await response.json();
        waMessageId = result.messages?.[0]?.id || null;
        status = "sent";
      } else {
        const errorBody = await response.json();
        console.error("WhatsApp API error:", errorBody);
        status = "failed";
      }
    } catch (err) {
      console.error("WhatsApp send error:", err);
      status = "failed";
    }
  }

  // Enregistrer le message en base
  const { error } = await supabase.from("whatsapp_messages").insert({
    connection_id: connection.id,
    prospect_id: data.prospectId,
    direction: "outbound",
    content: data.content,
    status,
    wa_message_id: waMessageId,
  });

  if (error) throw new Error(error.message);
  if (status === "failed") throw new Error("Échec de l'envoi WhatsApp");
  revalidatePath("/whatsapp");
}

export async function getWhatsAppSequences() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("whatsapp_sequences")
    .select("*")
    .order("created_at", { ascending: false });

  return data || [];
}

export async function createWhatsAppSequence(formData: {
  name: string;
  description?: string;
  funnel_type?: string;
  steps: Array<{ delay_minutes: number; message: string; media_url?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const { error } = await supabase.from("whatsapp_sequences").insert({
    name: formData.name,
    description: formData.description || null,
    funnel_type: formData.funnel_type || null,
    steps: formData.steps,
    is_active: true,
    created_by: user.id,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/whatsapp/sequences");
}

export async function updateWhatsAppSequence(
  id: string,
  formData: {
    name?: string;
    description?: string;
    funnel_type?: string;
    steps?: Array<{
      delay_minutes: number;
      message: string;
      media_url?: string;
    }>;
    is_active?: boolean;
  }
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("whatsapp_sequences")
    .update(formData)
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/whatsapp/sequences");
}

export async function getWhatsAppAnalytics() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Get the user's connection
  const { data: connection } = await supabase
    .from("whatsapp_connections")
    .select("id")
    .eq("user_id", user.id)
    .single();

  const connectionId = connection?.id;

  // Total messages sent & received
  const { data: allMessages } = await supabase
    .from("whatsapp_messages")
    .select("id, direction, status, sequence_id, created_at")
    .eq("connection_id", connectionId || "");

  const messages = allMessages || [];
  const totalSent = messages.filter((m) => m.direction === "outbound").length;
  const totalReceived = messages.filter(
    (m) => m.direction === "inbound"
  ).length;
  const responseRate =
    totalSent > 0 ? Math.round((totalReceived / totalSent) * 100) : 0;

  // Messages per day over last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const dailyMap: Record<string, { sent: number; received: number }> = {};
  for (let i = 0; i < 30; i++) {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    const key = d.toISOString().split("T")[0];
    dailyMap[key] = { sent: 0, received: 0 };
  }

  for (const msg of messages) {
    const day = msg.created_at?.split("T")[0];
    if (day && dailyMap[day]) {
      if (msg.direction === "outbound") {
        dailyMap[day].sent += 1;
      } else {
        dailyMap[day].received += 1;
      }
    }
  }

  const messagesPerDay = Object.entries(dailyMap).map(([date, counts]) => ({
    date,
    label: new Date(date).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
    }),
    sent: counts.sent,
    received: counts.received,
  }));

  // Sequences data
  const { data: sequences } = await supabase
    .from("whatsapp_sequences")
    .select("*")
    .order("created_at", { ascending: false });

  const allSequences = sequences || [];
  const activeSequences = allSequences.filter((s) => s.is_active).length;

  // Top performing sequences by response rate
  const sequenceStats = allSequences.map((seq) => {
    const seqMessages = messages.filter((m) => m.sequence_id === seq.id);
    const seqSent = seqMessages.filter(
      (m) => m.direction === "outbound"
    ).length;
    const seqReceived = seqMessages.filter(
      (m) => m.direction === "inbound"
    ).length;
    const seqResponseRate =
      seqSent > 0 ? Math.round((seqReceived / seqSent) * 100) : 0;

    return {
      id: seq.id,
      name: seq.name || "Sans nom",
      is_active: seq.is_active,
      total_sent: seqSent,
      total_received: seqReceived,
      response_rate: seqResponseRate,
      steps_count: Array.isArray(seq.steps) ? seq.steps.length : 0,
    };
  });

  sequenceStats.sort((a, b) => b.response_rate - a.response_rate);

  return {
    totalSent,
    totalReceived,
    responseRate,
    activeSequences,
    totalSequences: allSequences.length,
    messagesPerDay,
    sequenceStats,
  };
}

export async function deleteWhatsAppSequence(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("whatsapp_sequences")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/whatsapp/sequences");
}

// ---------------------------------------------------------------------------
// WhatsApp Business API — Cloud API stubs
// Falls back gracefully when WHATSAPP_TOKEN / WHATSAPP_PHONE_NUMBER_ID are not set.
// ---------------------------------------------------------------------------

const WA_GRAPH_API = "https://graph.facebook.com/v21.0";

export async function connectWhatsAppBusiness(
  phoneNumberId: string,
  token: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  if (!phoneNumberId?.trim() || !token?.trim()) {
    return { error: "Le Phone Number ID et le token sont requis" };
  }

  // Validate credentials by fetching the phone number info
  try {
    const res = await fetch(
      `${WA_GRAPH_API}/${phoneNumberId}?fields=verified_name,display_phone_number,quality_rating&access_token=${token}`
    );

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return {
        error: `Identifiants invalides : ${(body as Record<string, unknown>).error || res.statusText}`,
      };
    }

    const phoneInfo = (await res.json()) as {
      verified_name?: string;
      display_phone_number?: string;
      quality_rating?: string;
    };

    // Store credentials in whatsapp_connections
    const { data: existing } = await supabase
      .from("whatsapp_connections")
      .select("id")
      .eq("user_id", user.id)
      .single();

    const apiConfig = {
      phone_number_id: phoneNumberId,
      access_token: token,
      verified_name: phoneInfo.verified_name || null,
      display_phone_number: phoneInfo.display_phone_number || null,
      quality_rating: phoneInfo.quality_rating || null,
    };

    if (existing) {
      const { error } = await supabase
        .from("whatsapp_connections")
        .update({
          phone_number: phoneInfo.display_phone_number || phoneNumberId,
          status: "connected",
          api_config: apiConfig,
          connected_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
      if (error) return { error: error.message };
    } else {
      const { error } = await supabase.from("whatsapp_connections").insert({
        user_id: user.id,
        phone_number: phoneInfo.display_phone_number || phoneNumberId,
        status: "connected",
        api_config: apiConfig,
        connected_at: new Date().toISOString(),
      });
      if (error) return { error: error.message };
    }

    revalidatePath("/whatsapp");
    revalidatePath("/whatsapp/settings");
    return {
      data: {
        verified_name: phoneInfo.verified_name,
        display_phone_number: phoneInfo.display_phone_number,
        quality_rating: phoneInfo.quality_rating,
      },
    };
  } catch (err) {
    console.error("WhatsApp Business connect error:", err);
    return { error: "Impossible de valider les identifiants WhatsApp Business" };
  }
}

export async function sendWhatsAppTemplate(
  to: string,
  templateName: string,
  params: Record<string, string>
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  if (!to?.trim() || !templateName?.trim()) {
    return { error: "Le destinataire et le nom du template sont requis" };
  }

  // Resolve credentials: getApiKey (env → org_settings) first, then stored api_config
  let accessToken = await getApiKey("WHATSAPP_ACCESS_TOKEN");
  let phoneNumberId = await getApiKey("WHATSAPP_PHONE_NUMBER_ID");

  if (!accessToken || !phoneNumberId) {
    const { data: connection } = await supabase
      .from("whatsapp_connections")
      .select("api_config")
      .eq("user_id", user.id)
      .single();

    const config = connection?.api_config as Record<string, string> | null;
    if (config) {
      accessToken = accessToken || config.access_token;
      phoneNumberId = phoneNumberId || config.phone_number_id;
    }
  }

  if (!accessToken || !phoneNumberId) {
    // Queue locally when no API credentials
    const { data: connection } = await supabase
      .from("whatsapp_connections")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (connection) {
      await supabase.from("whatsapp_messages").insert({
        connection_id: connection.id,
        prospect_id: null,
        direction: "outbound",
        content: `[Template: ${templateName}] ${JSON.stringify(params)}`,
        status: "queued",
      });
    }

    return {
      data: { status: "queued", message_id: null },
      error:
        "API WhatsApp non configurée — message template enregistré localement. Ajoutez WHATSAPP_TOKEN et WHATSAPP_PHONE_NUMBER_ID ou connectez votre compte Business.",
    };
  }

  // Build template parameters
  const components: Array<Record<string, unknown>> = [];
  const paramKeys = Object.keys(params);
  if (paramKeys.length > 0) {
    components.push({
      type: "body",
      parameters: paramKeys.map((key) => ({
        type: "text",
        text: params[key],
      })),
    });
  }

  try {
    const res = await fetch(
      `${WA_GRAPH_API}/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: to.replace(/[^0-9]/g, ""),
          type: "template",
          template: {
            name: templateName,
            language: { code: "fr" },
            components,
          },
        }),
      }
    );

    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({}));
      console.error("WhatsApp template API error:", errorBody);
      return { error: "Échec de l'envoi du template WhatsApp" };
    }

    const result = (await res.json()) as {
      messages?: Array<{ id: string }>;
    };

    const waMessageId = result.messages?.[0]?.id || null;

    // Store in DB
    const { data: connection } = await supabase
      .from("whatsapp_connections")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (connection) {
      await supabase.from("whatsapp_messages").insert({
        connection_id: connection.id,
        prospect_id: null,
        direction: "outbound",
        content: `[Template: ${templateName}] ${JSON.stringify(params)}`,
        status: "sent",
        wa_message_id: waMessageId,
      });
    }

    revalidatePath("/whatsapp");
    return { data: { status: "sent", message_id: waMessageId } };
  } catch (err) {
    console.error("WhatsApp template send error:", err);
    return { error: "Erreur lors de l'envoi du template WhatsApp" };
  }
}

export async function getWhatsAppBusinessProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  // Resolve credentials: getApiKey (env → org_settings) first, then stored api_config
  let accessToken = await getApiKey("WHATSAPP_ACCESS_TOKEN");
  let phoneNumberId = await getApiKey("WHATSAPP_PHONE_NUMBER_ID");

  // Check stored config
  const { data: connection } = await supabase
    .from("whatsapp_connections")
    .select("id, phone_number, status, api_config, connected_at")
    .eq("user_id", user.id)
    .single();

  const config = connection?.api_config as Record<string, string> | null;
  if (config) {
    accessToken = accessToken || config.access_token;
    phoneNumberId = phoneNumberId || config.phone_number_id;
  }

  if (!accessToken || !phoneNumberId) {
    // Return local connection info only
    if (connection) {
      return {
        data: {
          phone_number: connection.phone_number,
          status: connection.status,
          connected_at: connection.connected_at,
          verified_name: config?.verified_name || null,
          quality_rating: null,
          source: "local_database" as const,
        },
        error:
          "API WhatsApp non configurée — profil local uniquement. Ajoutez WHATSAPP_TOKEN et WHATSAPP_PHONE_NUMBER_ID.",
      };
    }
    return {
      data: null,
      error:
        "Aucune connexion WhatsApp trouvée. Connectez votre compte WhatsApp Business.",
    };
  }

  // --- Live API path ---
  try {
    const res = await fetch(
      `${WA_GRAPH_API}/${phoneNumberId}/whatsapp_business_profile?fields=about,address,description,email,profile_picture_url,websites,vertical&access_token=${accessToken}`
    );

    if (res.ok) {
      const json = (await res.json()) as {
        data?: Array<{
          about?: string;
          address?: string;
          description?: string;
          email?: string;
          profile_picture_url?: string;
          websites?: string[];
          vertical?: string;
        }>;
      };

      const profile = json.data?.[0] || {};

      // Also fetch phone number details
      const phoneRes = await fetch(
        `${WA_GRAPH_API}/${phoneNumberId}?fields=verified_name,display_phone_number,quality_rating&access_token=${accessToken}`
      );
      const phoneInfo = phoneRes.ok
        ? ((await phoneRes.json()) as Record<string, string>)
        : {};

      return {
        data: {
          phone_number: phoneInfo.display_phone_number || connection?.phone_number || null,
          verified_name: phoneInfo.verified_name || null,
          quality_rating: phoneInfo.quality_rating || null,
          about: profile.about || null,
          description: profile.description || null,
          email: profile.email || null,
          address: profile.address || null,
          profile_picture_url: profile.profile_picture_url || null,
          websites: profile.websites || [],
          vertical: profile.vertical || null,
          status: connection?.status || "connected",
          connected_at: connection?.connected_at || null,
          source: "whatsapp_api" as const,
        },
      };
    }

    console.warn("WhatsApp business profile fetch failed");
  } catch (err) {
    console.error("WhatsApp business profile error:", err);
  }

  // Fallback to local data
  return {
    data: connection
      ? {
          phone_number: connection.phone_number,
          status: connection.status,
          connected_at: connection.connected_at,
          verified_name: config?.verified_name || null,
          quality_rating: config?.quality_rating || null,
          source: "local_database" as const,
        }
      : null,
  };
}

export async function triggerOptInSequence(
  prospectId: string,
  sequenceId: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  // Get connection
  const { data: connection } = await supabase
    .from("whatsapp_connections")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!connection) throw new Error("Aucune connexion WhatsApp");

  // Get the sequence
  const { data: sequence } = await supabase
    .from("whatsapp_sequences")
    .select("*")
    .eq("id", sequenceId)
    .single();

  if (!sequence) throw new Error("Séquence introuvable");

  // Envoyer le premier message de la séquence pour déclencher le nurturing
  const steps = (sequence.steps as Array<{ message: string }>) || [];
  if (steps.length > 0) {
    await supabase.from("whatsapp_messages").insert({
      connection_id: connection.id,
      prospect_id: prospectId,
      direction: "outbound",
      content: steps[0].message,
      status: "sent",
      sequence_id: sequenceId,
    });
  }

  revalidatePath("/whatsapp");
}
