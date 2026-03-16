"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { aiJSON, SMART_MODEL } from "@/lib/ai/client";
import { callApifyActor } from "@/lib/apify";

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

  // Search for real similar prospects in the database based on shared attributes
  let query = supabase
    .from("prospects")
    .select("id, name, platform, status, notes, score, profile_url")
    .neq("id", prospectId)
    .limit(10);

  if (prospect.platform) {
    query = query.eq("platform", prospect.platform);
  }

  const { data: similar } = await query;

  if (!similar || similar.length === 0) {
    return [];
  }

  return similar.map((p) => ({
    name: p.name || "Inconnu",
    sector: p.platform || "—",
    similarity: p.score ?? 50,
    reason: `Même plateforme (${p.platform || "N/A"}) — statut : ${p.status || "N/A"}`,
    suggestedApproach: p.notes || "Approche standard recommandée",
  }));
}

// ─── LinkedIn Company Scraper ───────────────────────────────────────

export async function scrapeCompanyLinkedIn(linkedinUrl: string) {
  const results = await callApifyActor("dev_fusion/Linkedin-Company-Scraper", {
    profileUrls: [linkedinUrl],
  });
  if (!results?.[0]) return null;
  const company = results[0] as Record<string, unknown>;
  return {
    name: company.name as string | undefined,
    industry: company.industry as string | undefined,
    employeeCount: (company.employeeCount || company.staffCount) as
      | number
      | undefined,
    headquarters: company.headquarters as string | undefined,
    website: company.website as string | undefined,
    description: company.description as string | undefined,
    specialties: company.specialities as string[] | undefined,
    founded: company.foundedOn as string | undefined,
    type: company.type as string | undefined,
    source: "linkedin_apify" as const,
  };
}

export async function searchCompanyDeciders(
  companyLinkedInUrl: string,
  jobTitles?: string[],
) {
  const results = await callApifyActor(
    "harvestapi/linkedin-company-employees",
    {
      companies: [companyLinkedInUrl],
      maxItems: 10,
      profileScraperMode: "Full + email search ($12 per 1k)",
      seniorityLevelIds: ["300", "310", "320"],
      jobTitles: jobTitles || [],
    },
  );
  return (
    (results as Record<string, unknown>[])?.map((p) => ({
      name:
        (p.fullName as string) ||
        `${p.firstName || ""} ${p.lastName || ""}`.trim(),
      title: (p.headline as string) || (p.currentJobTitle as string),
      email: p.email as string | undefined,
      phone: p.phone as string | undefined,
      linkedinUrl: (p.linkedinUrl as string) || (p.profileUrl as string),
      company: p.currentCompany as string | undefined,
      source: "linkedin_employees_apify" as const,
    })) || []
  );
}

// ─── Competitors ────────────────────────────────────────────────────

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
    // Table n'existe pas — retourner un tableau vide
  }

  return [];
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

export async function analyzeCompetitor(
  competitorName: string,
  linkedinUrl?: string,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  // ─── Tier 1 : Recherche Google via Apify (données web réelles) ────
  let googleContext = "";
  try {
    interface ApifyGoogleSearchResult {
      title?: string;
      description?: string;
      url?: string;
      [key: string]: unknown;
    }

    const searchResults = await callApifyActor<ApifyGoogleSearchResult>(
      "apify/google-search-scraper",
      {
        queries: `${competitorName} pricing features avis`,
        maxPagesPerQuery: 1,
        resultsPerPage: 5,
        languageCode: "fr",
        countryCode: "fr",
      },
      120,
    );

    if (searchResults && searchResults.length > 0) {
      const snippets = searchResults
        .filter((r) => r.title && r.description)
        .slice(0, 5)
        .map((r) => `- ${r.title}: ${r.description}`)
        .join("\n");

      if (snippets) {
        googleContext = `\n\nResultats de recherche Google reels pour "${competitorName}" :\n${snippets}`;
      }
    }
  } catch (googleErr) {
    console.error("[analyzeCompetitor] Google Search Apify echoue:", googleErr);
  }

  // ─── Tier 2 : Enrichir avec des données LinkedIn réelles si disponible
  let linkedinContext = "";
  if (linkedinUrl) {
    try {
      const linkedinData = await scrapeCompanyLinkedIn(linkedinUrl);
      if (linkedinData) {
        linkedinContext = `\n\nDonnées LinkedIn réelles de l'entreprise :
- Industrie : ${linkedinData.industry || "N/A"}
- Effectifs : ${linkedinData.employeeCount || "N/A"}
- Siège : ${linkedinData.headquarters || "N/A"}
- Site web : ${linkedinData.website || "N/A"}
- Description : ${linkedinData.description || "N/A"}
- Spécialités : ${linkedinData.specialties?.join(", ") || "N/A"}
- Fondée : ${linkedinData.founded || "N/A"}
- Type : ${linkedinData.type || "N/A"}`;
      }
    } catch {
      // Si le scraping LinkedIn échoue, on continue avec l'analyse IA seule
    }
  }

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
    `Réalise une analyse concurrentielle complète de "${competitorName}" par rapport à un CRM de vente français moderne avec gamification, IA intégrée, prospection multi-canal, et academy de formation.${googleContext}${linkedinContext}

Réponds en JSON avec :
- swot: { strengths: string[], weaknesses: string[], opportunities: string[], threats: string[] } (3-4 points chacun)
- positioning: description du positionnement marché (2-3 phrases)
- pricingComparison: comparaison tarifaire (2-3 phrases)
- keyDifferentiators: liste de 3-4 différenciateurs clés de notre solution
- recommendation: recommandation stratégique (2-3 phrases)`,
    { model: SMART_MODEL, maxTokens: 2048 },
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
    trends: {
      title: string;
      description: string;
      impact: "positif" | "neutre" | "negatif";
    }[];
    opportunities: {
      title: string;
      description: string;
      priority: "haute" | "moyenne" | "basse";
    }[];
    risks: { title: string; description: string }[];
  }>(
    `Tu es un analyste marché spécialisé dans les ventes B2B en France. Analyse les données de deals suivantes et génère des insights marché.

Données deals (${dealSummary.length} deals récents) : ${JSON.stringify(dealSummary)}

Réponds en JSON avec :
- overview: résumé du marché (3-4 phrases)
- trends: tableau de 4-5 tendances avec title, description, impact ("positif"|"neutre"|"negatif")
- opportunities: tableau de 3-4 opportunités avec title, description, priority ("haute"|"moyenne"|"basse")
- risks: tableau de 2-3 risques avec title et description`,
    { model: SMART_MODEL, maxTokens: 2048 },
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
    { model: SMART_MODEL, maxTokens: 2048 },
  );

  return result;
}
