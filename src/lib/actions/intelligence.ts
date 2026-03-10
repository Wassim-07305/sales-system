"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { aiJSON, SMART_MODEL } from "@/lib/ai/client";

// ─── Lookalikes ─────────────────────────────────────────────────────

export async function getLookalikes(prospectId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const { data: prospect } = await supabase
    .from("prospects")
    .select("*")
    .eq("id", prospectId)
    .single();

  if (!prospect) throw new Error("Prospect introuvable");

  const result = await aiJSON<{
    lookalikes: {
      name: string;
      sector: string;
      similarity: number;
      reason: string;
      suggestedApproach: string;
    }[];
  }>(
    `Analyse ce prospect et suggère 5 profils similaires à cibler.
Prospect : ${JSON.stringify({ name: prospect.name, platform: prospect.platform, notes: prospect.notes, status: prospect.status })}

Réponds en JSON avec un tableau "lookalikes" contenant pour chaque suggestion :
- name (nom fictif réaliste d'entreprise ou personne)
- sector (secteur d'activité)
- similarity (score de 0 à 100)
- reason (pourquoi ce profil est similaire)
- suggestedApproach (approche recommandée)`,
    { model: SMART_MODEL, maxTokens: 2048 }
  );

  return result.lookalikes;
}

// ─── Competitors ────────────────────────────────────────────────────

const DEMO_COMPETITORS = [
  {
    id: "comp-1",
    name: "SalesForce FR",
    website: "https://salesforce.com/fr",
    strengths: "Leader mondial, écosystème riche, IA Einstein intégrée",
    weaknesses: "Prix élevés, complexité de mise en place, interface chargée",
    pricingTier: "Premium (300-500€/utilisateur/mois)",
    notes: "",
  },
  {
    id: "comp-2",
    name: "HubSpot Sales",
    website: "https://hubspot.fr",
    strengths: "Freemium attractif, UX intuitive, intégration marketing native",
    weaknesses: "Fonctions avancées payantes, limité en personnalisation, rapports basiques en gratuit",
    pricingTier: "Mid-range (45-150€/utilisateur/mois)",
    notes: "",
  },
  {
    id: "comp-3",
    name: "Pipedrive",
    website: "https://pipedrive.com/fr",
    strengths: "Pipeline visuel excellent, simplicité, bon rapport qualité-prix",
    weaknesses: "Peu de fonctions marketing, analytics limitées, pas de module formation",
    pricingTier: "Accessible (15-99€/utilisateur/mois)",
    notes: "",
  },
  {
    id: "comp-4",
    name: "NoCRM.io",
    website: "https://nocrm.io",
    strengths: "Made in France, ultra-simple, focus closing, prise en main rapide",
    weaknesses: "Pas de prospection avancée, peu d'intégrations, pas de gamification",
    pricingTier: "Accessible (22-33€/utilisateur/mois)",
    notes: "",
  },
  {
    id: "comp-5",
    name: "Sellsy",
    website: "https://sellsy.com",
    strengths: "Solution française complète, facturation intégrée, support réactif",
    weaknesses: "Interface vieillissante, mobile limité, pas d'IA avancée",
    pricingTier: "Mid-range (29-99€/utilisateur/mois)",
    notes: "",
  },
  {
    id: "comp-6",
    name: "Close CRM",
    website: "https://close.com",
    strengths: "Calling intégré, séquences email, interface moderne",
    weaknesses: "Pas de version française, pricing USD, communauté limitée en France",
    pricingTier: "Mid-range (59-149$/utilisateur/mois)",
    notes: "",
  },
];

export async function getCompetitors() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  // Essayer de charger depuis Supabase
  try {
    const { data, error } = await supabase
      .from("competitors")
      .select("*")
      .order("name");

    if (!error && data && data.length > 0) {
      return data.map((c: Record<string, unknown>) => ({
        id: c.id as string,
        name: c.name as string,
        website: (c.website as string) || "",
        strengths: (c.strengths as string) || "",
        weaknesses: (c.weaknesses as string) || "",
        pricingTier: (c.pricing_tier as string) || "",
        notes: (c.notes as string) || "",
      }));
    }
  } catch {
    // Table n'existe pas — fallback aux données de référence
  }

  return DEMO_COMPETITORS;
}

export async function addCompetitor(data: {
  name: string;
  website: string;
  notes: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  // Persister dans Supabase
  try {
    const { data: inserted, error } = await supabase
      .from("competitors")
      .insert({
        name: data.name,
        website: data.website,
        notes: data.notes,
        strengths: "À analyser",
        weaknesses: "À analyser",
        pricing_tier: "Non renseigné",
      })
      .select()
      .single();

    if (!error && inserted) {
      revalidatePath("/prospecting/intelligence");
      return {
        id: inserted.id,
        name: inserted.name,
        website: inserted.website || "",
        strengths: inserted.strengths || "À analyser",
        weaknesses: inserted.weaknesses || "À analyser",
        pricingTier: inserted.pricing_tier || "Non renseigné",
        notes: inserted.notes || "",
      };
    }
  } catch {
    // Table n'existe pas — mode démo
  }

  const newCompetitor = {
    id: `comp-${Date.now()}`,
    name: data.name,
    website: data.website,
    strengths: "À analyser",
    weaknesses: "À analyser",
    pricingTier: "Non renseigné",
    notes: data.notes,
  };

  revalidatePath("/prospecting/intelligence");
  return newCompetitor;
}

export async function analyzeCompetitor(competitorName: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const result = await aiJSON<{
    swot: {
      strengths: string[];
      weaknesses: string[];
      opportunities: string[];
      threats: string[];
    };
    positioning: string;
    pricingComparison: string;
    keyDifferentiators: string[];
    recommendation: string;
  }>(
    `Réalise une analyse concurrentielle complète de "${competitorName}" par rapport à un CRM de vente français moderne avec gamification, IA intégrée, prospection multi-canal, et academy de formation.

Réponds en JSON avec :
- swot: { strengths: string[], weaknesses: string[], opportunities: string[], threats: string[] } (3-4 points chacun)
- positioning: description du positionnement marché (2-3 phrases)
- pricingComparison: comparaison tarifaire (2-3 phrases)
- keyDifferentiators: liste de 3-4 différenciateurs clés de notre solution
- recommendation: recommandation stratégique (2-3 phrases)`,
    { model: SMART_MODEL, maxTokens: 2048 }
  );

  return result;
}

// ─── Market Insights ────────────────────────────────────────────────

export async function getMarketInsights() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  // Fetch deal data for context
  const { data: deals } = await supabase
    .from("deals")
    .select("title, value, stage, created_at, closed_at")
    .order("created_at", { ascending: false })
    .limit(50);

  const dealSummary = (deals || []).map((d: Record<string, unknown>) => ({
    value: d.value,
    stage: d.stage,
  }));

  const result = await aiJSON<{
    overview: string;
    trends: { title: string; description: string; impact: "positif" | "neutre" | "negatif" }[];
    opportunities: { title: string; description: string; priority: "haute" | "moyenne" | "basse" }[];
    risks: { title: string; description: string }[];
  }>(
    `Tu es un analyste marché spécialisé dans les ventes B2B en France. Analyse les données de deals suivantes et génère des insights marché.

Données deals (${dealSummary.length} deals récents) : ${JSON.stringify(dealSummary)}

Réponds en JSON avec :
- overview: résumé du marché (3-4 phrases)
- trends: tableau de 4-5 tendances avec title, description, impact ("positif"|"neutre"|"negatif")
- opportunities: tableau de 3-4 opportunités avec title, description, priority ("haute"|"moyenne"|"basse")
- risks: tableau de 2-3 risques avec title et description`,
    { model: SMART_MODEL, maxTokens: 2048 }
  );

  return result;
}

// ─── Hunting Recommendations ────────────────────────────────────────

export async function getHuntingRecommendations() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  // Fetch won deals for pattern analysis
  const { data: wonDeals } = await supabase
    .from("deals")
    .select("title, value, stage, contact_id, created_at, closed_at")
    .eq("stage", "Client Signé")
    .order("value", { ascending: false })
    .limit(30);

  // Fetch contacts linked to won deals
  const contactIds = (wonDeals || [])
    .map((d: Record<string, unknown>) => d.contact_id as string)
    .filter(Boolean);

  let contacts: Record<string, unknown>[] = [];
  if (contactIds.length > 0) {
    const { data } = await supabase
      .from("contacts")
      .select("id, name, company, role, source")
      .in("id", contactIds);
    contacts = data || [];
  }

  const result = await aiJSON<{
    idealProfile: {
      description: string;
      characteristics: string[];
      sectors: string[];
      companySize: string;
      budget: string;
      decisionCriteria: string[];
    };
    huntingStrategies: {
      channel: string;
      approach: string;
      expectedConversion: string;
    }[];
    intentSignals: {
      signal: string;
      source: string;
      relevance: "forte" | "moyenne" | "faible";
    }[];
  }>(
    `Tu es un expert en stratégie de prospection B2B. Analyse les deals gagnés et les contacts associés pour recommander le profil prospect idéal à cibler.

Deals gagnés (${(wonDeals || []).length}) : ${JSON.stringify((wonDeals || []).map((d: Record<string, unknown>) => ({ title: d.title, value: d.value })))}

Contacts associés (${contacts.length}) : ${JSON.stringify(contacts.map((c: Record<string, unknown>) => ({ company: c.company, role: c.role, source: c.source })))}

Réponds en JSON avec :
- idealProfile: { description (3-4 phrases), characteristics (4-5 traits), sectors (3-4 secteurs), companySize, budget, decisionCriteria (3-4 critères) }
- huntingStrategies: tableau de 3-4 stratégies avec channel, approach, expectedConversion
- intentSignals: tableau de 5-6 signaux d'intention avec signal, source, relevance ("forte"|"moyenne"|"faible")`,
    { model: SMART_MODEL, maxTokens: 2048 }
  );

  return result;
}
