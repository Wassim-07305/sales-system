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
  // Stub -- will use AI later
  const score = Math.floor(Math.random() * 40) + 60;
  return {
    score,
    factors: ["Experience", "Disponibilite", "Specialisation"],
  };
}
