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
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const { error } = await supabase
    .from("ai_mode_configs")
    .update({
      global_mode: data.global_mode,
      network_overrides: data.network_overrides,
      critical_actions: data.critical_actions,
      updated_at: new Date().toISOString(),
    })
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
  // Stub: In production, this would log the validation event,
  // update an action queue, and proceed with the approved action.
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
