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
      "id, full_name, avatar_url, role, is_ready_to_place, matched_entrepreneur_id",
    )
    .in("role", ["client_b2b", "client_b2c"])
    .eq("is_ready_to_place", true);

  // Get available setters
  const { data: setters } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, role, setter_maturity_score")
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

export async function assignSetterToClient(setterId: string, clientId: string) {
  const supabase = await createClient();

  await supabase
    .from("profiles")
    .update({ matched_entrepreneur_id: setterId })
    .eq("id", clientId);

  revalidatePath("/dashboard");
}

/**
 * Feature #3 : Suggestions automatiques de matching setter ↔ entrepreneur
 * Retourne les top 3 entrepreneurs compatibles pour un setter donné.
 */
export async function getSuggestedMatches(setterId: string) {
  const supabase = await createClient();

  // Récupérer le profil setter + ses settings
  const { data: setter } = await supabase
    .from("profiles")
    .select(
      "id, full_name, setter_maturity_score, skills, industries, bio, niche",
    )
    .eq("id", setterId)
    .single();

  if (!setter) return { suggestions: [] };

  // Récupérer les settings du setter (objectif, dispo, situation)
  const { data: settings } = await supabase
    .from("user_settings")
    .select("key, value")
    .eq("user_id", setterId)
    .in("key", [
      "objectif_financier",
      "disponibilites_heures",
      "situation_actuelle",
      "skills",
    ]);

  const settingsMap: Record<string, string> = {};
  for (const s of settings || []) settingsMap[s.key] = s.value;

  // Récupérer les entrepreneurs B2B sans setter ou avec capacité d'en prendre plus
  const { data: entrepreneurs } = await supabase
    .from("profiles")
    .select("id, full_name, company, industry, bio, needs, niche")
    .eq("role", "client_b2b");

  if (!entrepreneurs || entrepreneurs.length === 0) return { suggestions: [] };

  // Récupérer les settings B2B (business_description, etc.)
  const entrepreneurIds = entrepreneurs.map((e) => e.id);
  const { data: b2bSettings } = await supabase
    .from("user_settings")
    .select("user_id, key, value")
    .in("user_id", entrepreneurIds)
    .in("key", ["business_description", "prospection_channels"]);

  const b2bSettingsMap: Record<string, Record<string, string>> = {};
  for (const s of b2bSettings || []) {
    if (!b2bSettingsMap[s.user_id]) b2bSettingsMap[s.user_id] = {};
    b2bSettingsMap[s.user_id][s.key] = s.value;
  }

  // Scorer chaque entrepreneur
  const scored = entrepreneurs.map((e) => {
    let score = 50; // base
    const reasons: string[] = [];
    const eSettings = b2bSettingsMap[e.id] || {};

    // Bonus maturité setter
    const maturity = setter.setter_maturity_score || 0;
    if (maturity >= 70) {
      score += 15;
      reasons.push("Setter expérimenté");
    } else if (maturity >= 40) {
      score += 8;
      reasons.push("Setter niveau intermédiaire");
    }

    // Matching industrie/niche
    const setterNiche = (setter.niche || "").toLowerCase();
    const eNiche = (e.niche || e.industry || "").toLowerCase();
    const eBusiness = (eSettings.business_description || "").toLowerCase();
    if (
      setterNiche &&
      (eNiche.includes(setterNiche) || eBusiness.includes(setterNiche))
    ) {
      score += 20;
      reasons.push("Niche compatible");
    }

    // Disponibilité
    const heures = parseInt(settingsMap.disponibilites_heures || "4", 10);
    if (heures >= 6) {
      score += 10;
      reasons.push(`${heures}h/jour disponibles`);
    } else if (heures >= 3) {
      score += 5;
      reasons.push(`${heures}h/jour`);
    }

    // Objectif financier → matching charge de travail
    if (settingsMap.objectif_financier === "remplacement") {
      score += 5;
      reasons.push("Motivé temps plein");
    }

    return {
      entrepreneur: e,
      score: Math.min(100, score),
      reasons,
      businessDesc: eSettings.business_description || e.bio || "",
    };
  });

  // Trier par score décroissant, retourner top 3
  scored.sort((a, b) => b.score - a.score);

  return {
    suggestions: scored.slice(0, 3).map((s) => ({
      entrepreneurId: s.entrepreneur.id,
      entrepreneurName:
        s.entrepreneur.full_name || s.entrepreneur.company || "Entrepreneur",
      company: s.entrepreneur.company || "",
      score: s.score,
      reasons: s.reasons,
      businessDesc: s.businessDesc.slice(0, 100),
    })),
  };
}

export async function calculateMatchScore(
  setterId: string,
  entrepreneurId: string,
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
        system:
          "Tu es un expert en matching commercial setter-entrepreneur. Évalue la compatibilité en tenant compte de l'expérience, l'industrie, les compétences et les besoins.",
        maxTokens: 500,
      },
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
