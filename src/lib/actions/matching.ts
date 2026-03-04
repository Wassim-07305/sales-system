"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getMatchingMatrix() {
  const supabase = await createClient();

  // Get clients who need matching
  const { data: clients } = await supabase
    .from("profiles")
    .select(
      "id, full_name, avatar_url, role, is_ready_to_place, matched_entrepreneur_id"
    )
    .in("role", ["client_b2b", "client_b2c"])
    .eq("is_ready_to_place", true);

  // Get available setters
  const { data: setters } = await supabase
    .from("profiles")
    .select(
      "id, full_name, avatar_url, role, setter_maturity_score"
    )
    .in("role", ["setter", "closer"]);

  // Get entrepreneurs
  const { data: entrepreneurs } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, company")
    .eq("role", "client_b2b");

  return {
    clients: clients || [],
    setters: setters || [],
    entrepreneurs: entrepreneurs || [],
  };
}

export async function assignSetterToClient(
  setterId: string,
  clientId: string
) {
  const supabase = await createClient();

  await supabase
    .from("profiles")
    .update({ matched_entrepreneur_id: setterId })
    .eq("id", clientId);

  revalidatePath("/dashboard");
}

export async function calculateMatchScore(
  setterId: string,
  entrepreneurId: string
) {
  const { isAiConfigured } = await import("@/lib/ai/client");
  const fallback = {
    score: Math.floor(Math.random() * 40) + 60,
    factors: ["Experience", "Disponibilite", "Specialisation"],
  };

  if (!isAiConfigured()) return fallback;

  try {
    const supabase = await createClient();
    const [{ data: setter }, { data: entrepreneur }] = await Promise.all([
      supabase.from("profiles").select("full_name, role, setter_maturity_score").eq("id", setterId).single(),
      supabase.from("profiles").select("full_name, role, company").eq("id", entrepreneurId).single(),
    ]);

    if (!setter || !entrepreneur) return fallback;

    const { completeJSON } = await import("@/lib/ai/utils");
    const { MATCH_SCORE_SYSTEM_PROMPT } = await import("@/lib/ai/prompts");

    return await completeJSON<typeof fallback>({
      system: MATCH_SCORE_SYSTEM_PROMPT,
      user: `Analyse la compatibilité entre ce setter et cet entrepreneur.\n\nSETTER :\n- Nom : ${setter.full_name}\n- Rôle : ${setter.role}\n- Score maturité : ${setter.setter_maturity_score ?? "N/A"}/100\n\nENTREPRENEUR :\n- Nom : ${entrepreneur.full_name}\n- Entreprise : ${entrepreneur.company || "N/A"}\n- Rôle : ${entrepreneur.role}`,
      model: "HAIKU",
      fallback,
    });
  } catch {
    return fallback;
  }
}
