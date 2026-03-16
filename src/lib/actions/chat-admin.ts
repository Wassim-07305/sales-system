"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/types/database";

const ADMIN_ROLES: UserRole[] = ["admin", "manager"];

async function requireAdmin() {
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

  if (!profile || !ADMIN_ROLES.includes(profile.role as UserRole)) {
    throw new Error("Accès refusé : rôle admin ou manager requis");
  }

  return { supabase, user };
}

export async function createChannel(data: {
  name: string;
  description?: string;
  type: "group" | "direct" | "announcement";
  memberIds: string[];
}) {
  const { user } = await requireAdmin();
  const adminClient = createAdminClient();

  const { error } = await adminClient.from("channels").insert({
    name: data.name,
    description: data.description || null,
    type: data.type,
    members: data.memberIds,
    created_by: user.id,
  });

  if (error) throw new Error(`Erreur création channel : ${error.message}`);
  // No revalidatePath — client refreshes channel list
}

export async function deleteChannel(channelId: string) {
  await requireAdmin();
  const adminClient = createAdminClient();

  // Supprimer les messages du channel d'abord
  await adminClient.from("messages").delete().eq("channel_id", channelId);

  // Supprimer les lectures
  await adminClient.from("channel_reads").delete().eq("channel_id", channelId);

  // Supprimer le channel
  const { error } = await adminClient
    .from("channels")
    .delete()
    .eq("id", channelId);

  if (error) throw new Error(`Erreur suppression channel : ${error.message}`);
  // No revalidatePath — client refreshes channel list
}

export async function updateChannelMembers(
  channelId: string,
  memberIds: string[],
) {
  await requireAdmin();
  const adminClient = createAdminClient();

  const { error } = await adminClient
    .from("channels")
    .update({ members: memberIds })
    .eq("id", channelId);

  if (error)
    throw new Error(`Erreur mise à jour des membres : ${error.message}`);
  // No revalidatePath — client refreshes channel list
}

export async function getChannelMembers(channelId: string) {
  const { supabase } = await requireAdmin();

  const { data: channel } = await supabase
    .from("channels")
    .select("members")
    .eq("id", channelId)
    .single();

  if (!channel) return [];

  const memberIds = (channel.members as string[]) || [];
  if (memberIds.length === 0) return [];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, role, avatar_url")
    .in("id", memberIds);

  return profiles || [];
}

export async function getAllUsers() {
  const { supabase } = await requireAdmin();

  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, role, avatar_url")
    .order("full_name", { ascending: true });

  return data || [];
}
