"use server";

import { createClient } from "@/lib/supabase/server";
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

  // Stub: create message record (actual sending would use WhatsApp API)
  const { error } = await supabase.from("whatsapp_messages").insert({
    connection_id: connection.id,
    prospect_id: data.prospectId,
    direction: "outbound",
    content: data.content,
    status: "sent",
  });

  if (error) throw new Error(error.message);
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

export async function deleteWhatsAppSequence(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("whatsapp_sequences")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/whatsapp/sequences");
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

  // Stub: create a first message from the sequence to indicate it was triggered
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
