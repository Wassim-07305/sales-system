"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { aiJSON } from "@/lib/ai/client";

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
  const supabase = await createClient();

  // Récupérer les profils des deux utilisateurs
  const [setterRes, entrepreneurRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, role, setter_maturity_score, skills, industries, bio")
      .eq("id", setterId)
      .single(),
    supabase
      .from("profiles")
      .select("full_name, role, company, industry, bio, needs")
      .eq("id", entrepreneurId)
      .single(),
  ]);

  const setter = setterRes.data;
  const entrepreneur = entrepreneurRes.data;

  if (!setter || !entrepreneur) {
    return {
      score: 50,
      factors: ["Données insuffisantes"],
    };
  }

  // Récupérer les performances du setter
  const { count: dealsCount } = await supabase
    .from("deals")
    .select("id", { count: "exact", head: true })
    .eq("assigned_to", setterId)
    .eq("status", "won");

  try {
    const result = await aiJSON<{
      score: number;
      factors: string[];
      recommendation?: string;
    }>(
      `Analyse la compatibilité entre ce setter et cet entrepreneur pour un matching commercial.

SETTER:
- Nom: ${setter.full_name || "?"}
- Score maturité: ${setter.setter_maturity_score || "Non évalué"}
- Compétences: ${JSON.stringify(setter.skills || [])}
- Industries: ${JSON.stringify(setter.industries || [])}
- Bio: ${setter.bio || "Aucune"}
- Deals gagnés: ${dealsCount || 0}

ENTREPRENEUR:
- Nom: ${entrepreneur.full_name || "?"}
- Entreprise: ${entrepreneur.company || "?"}
- Industrie: ${entrepreneur.industry || "?"}
- Bio: ${entrepreneur.bio || "Aucune"}
- Besoins: ${JSON.stringify(entrepreneur.needs || "Non spécifiés")}

Retourne un JSON avec:
- score: nombre entre 0-100 (compatibilité)
- factors: tableau de 3-5 facteurs clés (en français) qui influencent le score positivement ou négativement
- recommendation: phrase courte en français`,
      {
        system: "Tu es un expert en matching commercial setter-entrepreneur. Évalue la compatibilité en tenant compte de l'expérience, l'industrie, les compétences et les besoins.",
        maxTokens: 500,
      }
    );

    return {
      score: Math.min(100, Math.max(0, result.score || 50)),
      factors: result.factors || ["Analyse IA"],
      recommendation: result.recommendation,
    };
  } catch {
    // Fallback : calcul basique sans IA
    const baseScore = 50;
    const maturityBonus = Math.min(20, (setter.setter_maturity_score || 0) / 5);
    const dealsBonus = Math.min(15, (dealsCount || 0) * 3);
    const score = Math.round(baseScore + maturityBonus + dealsBonus);

    return {
      score,
      factors: [
        `Maturité setter: ${setter.setter_maturity_score || 0}/100`,
        `${dealsCount || 0} deal(s) gagné(s)`,
        "Analyse IA indisponible — score basique",
      ],
    };
  }
}
