"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { AiMode } from "@/lib/types/database";

const DEFAULT_CRITICAL_ACTIONS = [
  "Envoi de message initial",
  "Relance automatique",
  "Booking automatique",
  "Modification de prix",
  "Envoi de contrat",
];

const DEFAULT_TEMPLATE =
  "Bonjour {nom}, j'ai vu votre activite autour de {activite} et j'ai trouve {dernier_post} vraiment inspirant. J'aimerais echanger avec vous !";

export async function getAiModeConfig() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("ai_mode_configs")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (data) return data;

  // Create default config if none exists
  const defaultConfig = {
    user_id: user.id,
    global_mode: "critical_validation" as AiMode,
    network_overrides: {} as Record<string, AiMode>,
    critical_actions: DEFAULT_CRITICAL_ACTIONS,
    auto_send_enabled: false,
    auto_send_platforms: [] as string[],
    auto_send_template: DEFAULT_TEMPLATE,
    auto_send_mode: "critical_validation" as AiMode,
    story_reaction_enabled: false,
    story_reaction_emoji: "\u{1F525}",
  };

  const { data: newConfig } = await supabase
    .from("ai_mode_configs")
    .insert(defaultConfig)
    .select()
    .single();

  return newConfig;
}

export async function updateAiModeConfig(data: {
  global_mode: AiMode;
  network_overrides: Record<string, AiMode>;
  critical_actions: string[];
  auto_send_enabled?: boolean;
  auto_send_platforms?: string[];
  auto_send_template?: string;
  auto_send_mode?: AiMode;
  story_reaction_enabled?: boolean;
  story_reaction_emoji?: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const updatePayload: Record<string, unknown> = {
    global_mode: data.global_mode,
    network_overrides: data.network_overrides,
    critical_actions: data.critical_actions,
    updated_at: new Date().toISOString(),
  };

  // Include auto-send fields if provided
  if (data.auto_send_enabled !== undefined)
    updatePayload.auto_send_enabled = data.auto_send_enabled;
  if (data.auto_send_platforms !== undefined)
    updatePayload.auto_send_platforms = data.auto_send_platforms;
  if (data.auto_send_template !== undefined)
    updatePayload.auto_send_template = data.auto_send_template;
  if (data.auto_send_mode !== undefined)
    updatePayload.auto_send_mode = data.auto_send_mode;
  if (data.story_reaction_enabled !== undefined)
    updatePayload.story_reaction_enabled = data.story_reaction_enabled;
  if (data.story_reaction_emoji !== undefined)
    updatePayload.story_reaction_emoji = data.story_reaction_emoji;

  const { error } = await supabase
    .from("ai_mode_configs")
    .update(updatePayload)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/settings/ai-modes");
  return { success: true };
}

export async function checkCriticalAction(action: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { requiresValidation: false };

  const { data: config } = await supabase
    .from("ai_mode_configs")
    .select("global_mode, critical_actions")
    .eq("user_id", user.id)
    .single();

  if (!config) return { requiresValidation: false };

  if (config.global_mode !== "critical_validation") {
    return { requiresValidation: false };
  }

  const criticalActions = (config.critical_actions as string[]) || [];
  return { requiresValidation: criticalActions.includes(action) };
}

export async function validateAction(action: string) {
  // Journaliser l'événement de validation et approuver l'action
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  return {
    success: true,
    action,
    validated_at: new Date().toISOString(),
    validated_by: user.id,
  };
}
