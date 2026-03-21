"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { aiJSON } from "@/lib/ai/client";
import { callApifyActor } from "@/lib/apify";

// ─── Type pour les résultats d'enrichissement Apify ─────────────────
interface ApifyCompanyEnrichment {
  domain?: string;
  name?: string;
  description?: string;
  industry?: string;
  sector?: string;
  employees?: number;
  employeeRange?: string;
  founded?: number;
  tech?: string[];
  socials?: {
    linkedin?: string;
    twitter?: string;
    facebook?: string;
  };
  seo?: {
    domainAuthority?: number;
    organicTraffic?: number;
  };
  contact?: {
    email?: string;
    phone?: string;
  };
  whois?: {
    registrar?: string;
    createdDate?: string;
  };
  [key: string]: unknown;
}

// ─── Extraire un domaine depuis un email ou un champ website/company ─
function extractDomain(email: string, company: string): string | null {
  // Depuis l'email (le plus fiable)
  if (email.includes("@")) {
    const domain = email.split("@")[1];
    // Ignorer les domaines génériques
    const genericDomains = [
      "gmail.com",
      "yahoo.com",
      "hotmail.com",
      "outlook.com",
      "live.com",
      "orange.fr",
      "free.fr",
      "sfr.fr",
      "laposte.net",
      "icloud.com",
      "protonmail.com",
      "mail.com",
    ];
    if (!genericDomains.includes(domain.toLowerCase())) {
      return domain;
    }
  }

  // Depuis le champ company s'il ressemble à un domaine/URL
  if (company) {
    const urlMatch = company.match(
      /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+\.[a-zA-Z]{2,})/,
    );
    if (urlMatch) return urlMatch[1];
  }

  return null;
}

// ─── Mapper les données Apify vers le format d'enrichissement ───────
function mapApifyToEnrichment(data: ApifyCompanyEnrichment) {
  // Estimation de la taille à partir du nombre d'employés
  let tailleEntreprise = "";
  if (data.employeeRange) {
    tailleEntreprise = data.employeeRange;
  } else if (data.employees) {
    const e = data.employees;
    if (e <= 10) tailleEntreprise = "1-10";
    else if (e <= 50) tailleEntreprise = "11-50";
    else if (e <= 200) tailleEntreprise = "51-200";
    else if (e <= 500) tailleEntreprise = "201-500";
    else tailleEntreprise = "500+";
  }

  // Points clés à partir des données disponibles
  const pointsCles: string[] = [];
  if (data.industry) pointsCles.push(`Secteur : ${data.industry}`);
  if (data.tech && data.tech.length > 0) {
    pointsCles.push(`Technologies : ${data.tech.slice(0, 5).join(", ")}`);
  }
  if (data.founded) pointsCles.push(`Fondée en ${data.founded}`);
  if (data.seo?.domainAuthority) {
    pointsCles.push(`Autorité de domaine : ${data.seo.domainAuthority}`);
  }
  if (data.description) {
    pointsCles.push(data.description.slice(0, 150));
  }

  return {
    secteur: data.industry || data.sector || "",
    taille_entreprise: tailleEntreprise,
    poste_probable: "", // Apify company enrichment ne donne pas le poste
    budget_estime: "", // Pas disponible via cet acteur
    meilleur_moment_contact: "", // Pas disponible
    profil_linkedin_probable: data.socials?.linkedin || "",
    profil_twitter_probable: data.socials?.twitter || "",
    site_web_probable: data.domain ? `https://${data.domain}` : "",
    points_cles:
      pointsCles.length > 0 ? pointsCles : ["Données vérifiées via Apify"],
    confiance: Math.min(
      100,
      40 +
        pointsCles.length * 10 +
        (data.industry ? 10 : 0) +
        (data.domain ? 10 : 0) +
        (data.socials?.linkedin ? 10 : 0),
    ),
  };
}

// ─── enrichProspect ─────────────────────────────────────────────────
export async function enrichProspect(prospectId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const { data: prospect, error } = await supabase
    .from("prospects")
    .select("*")
    .eq("id", prospectId)
    .single();

  if (error || !prospect) throw new Error("Prospect introuvable");

  const name = (prospect.name as string) || "";
  const email = (prospect.email as string) || "";
  const company = (prospect.company as string) || "";
  const profileUrl = (prospect.profile_url as string) || "";
  const notes = (prospect.notes as string) || "";

  // Extract email domain for hints
  const emailDomain = email.includes("@") ? email.split("@")[1] : "";

  // ─── Tier 1 : Enrichissement via Apify (données réelles) ─────────
  const domain = extractDomain(email, company);
  let enrichmentSource: "apify_verified" | "ai_estimation" = "ai_estimation";
  let enrichmentData: {
    secteur: string;
    taille_entreprise: string;
    poste_probable: string;
    budget_estime: string;
    meilleur_moment_contact: string;
    profil_linkedin_probable: string;
    profil_twitter_probable: string;
    site_web_probable: string;
    points_cles: string[];
    confiance: number;
  } | null = null;

  if (domain) {
    try {
      const apifyResults = await callApifyActor<ApifyCompanyEnrichment>(
        "george.the.developer/company-enrichment-api",
        { domain },
      );

      if (apifyResults && apifyResults.length > 0) {
        const companyData = apifyResults[0];
        // Vérifier qu'on a au moins quelques données utiles
        if (companyData.industry || companyData.employees || companyData.tech) {
          enrichmentData = mapApifyToEnrichment(companyData);
          enrichmentSource = "apify_verified";
        }
      }
    } catch (apifyError) {
      console.error("[enrichProspect] Erreur Apify, fallback IA:", apifyError);
    }
  }

  // ─── Tier 2 : Fallback IA (estimations) ──────────────────────────
  if (!enrichmentData) {
    const prompt = `Tu es un expert en intelligence commerciale B2B.
À partir des informations suivantes sur un prospect, génère des données d'enrichissement.

Nom: ${name}
Email: ${email}
Domaine email: ${emailDomain}
Entreprise: ${company}
URL profil: ${profileUrl}
Notes existantes: ${notes}

Génère un JSON avec ces champs:
- secteur (string): secteur d'activité probable
- taille_entreprise (string): estimation de la taille (ex: "1-10", "11-50", "51-200", "201-500", "500+")
- poste_probable (string): titre/poste probable du prospect
- budget_estime (string): fourchette de budget estimée (ex: "5k-15k€", "15k-50k€", "50k-100k€", "100k+€")
- meilleur_moment_contact (string): meilleur créneau pour contacter (ex: "Mardi-Jeudi, 9h-11h")
- profil_linkedin_probable (string): URL LinkedIn probable ou pattern
- profil_twitter_probable (string): URL Twitter/X probable ou pattern
- site_web_probable (string): site web probable
- points_cles (string[]): 3-5 points clés à utiliser en approche commerciale
- confiance (number): score de confiance de 0 à 100 sur la fiabilité des données générées`;

    try {
      enrichmentData = await aiJSON<typeof enrichmentData>(prompt, {
        system:
          "Tu es un assistant d'enrichissement de données commerciales. Réponds uniquement en JSON valide. Base tes estimations sur les indices disponibles (nom, email, entreprise). Sois réaliste et indique un score de confiance honnête.",
      });
    } catch (aiError) {
      console.error("[enrichProspect] Erreur IA:", aiError);
      throw new Error(
        "L'enrichissement a échoué. Veuillez réessayer plus tard.",
      );
    }
  }

  if (!enrichmentData) {
    throw new Error(
      "L'enrichissement a échoué. Aucune source n'a retourné de données.",
    );
  }

  const disclaimer =
    enrichmentSource === "apify_verified"
      ? "Données vérifiées via Apify (company-enrichment-api). Certains champs peuvent nécessiter une validation manuelle."
      : "Données estimées par IA, non vérifiées. Aucune source externe (Clearbit, Apollo, etc.) n'a été consultée.";

  // Save enrichment data to prospect metadata
  const existingMetadata =
    typeof prospect.metadata === "object" && prospect.metadata !== null
      ? (prospect.metadata as Record<string, unknown>)
      : {};

  const updatedMetadata = {
    ...existingMetadata,
    enrichment: {
      ...enrichmentData,
      source: enrichmentSource,
      disclaimer,
      enriched_at: new Date().toISOString(),
      enriched_by: user.id,
    },
  };

  const { error: updateError } = await supabase
    .from("prospects")
    .update({ metadata: updatedMetadata })
    .eq("id", prospectId);

  if (updateError) throw new Error(updateError.message);

  // Log enrichment activity
  await supabase.from("activity_logs").insert({
    user_id: user.id,
    action: "enrichment",
    entity_type: "prospect",
    entity_id: prospectId,
    metadata: {
      prospect_name: name,
      confiance: enrichmentData.confiance,
      source: enrichmentSource,
    },
  });

  revalidatePath("/prospecting/enrichment");
  return {
    ...enrichmentData,
    source: enrichmentSource,
    disclaimer,
  };
}

// ─── enrichBatch (optimisé — un seul appel Apify bulk) ──────────────
export async function enrichBatch(prospectIds: string[]) {
  if (prospectIds.length === 0) return { success: 0, failed: 0 };
  // Limit to 10 at a time
  const ids = prospectIds.slice(0, 10);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  // 1. Récupérer tous les prospects
  const { data: prospects } = await supabase
    .from("prospects")
    .select("*")
    .in("id", ids);

  if (!prospects || prospects.length === 0) return { success: 0, failed: 0 };

  // 2. Extraire les domaines de chaque prospect
  const prospectDomainMap = new Map<
    string,
    { prospectId: string; domain: string }
  >();
  const prospectsWithoutDomain: string[] = [];

  for (const p of prospects) {
    const email = (p.email as string) || "";
    const company = (p.company as string) || "";
    const domain = extractDomain(email, company);

    if (domain) {
      prospectDomainMap.set(domain, { prospectId: p.id as string, domain });
    } else {
      prospectsWithoutDomain.push(p.id as string);
    }
  }

  let success = 0;
  let failed = 0;

  // 3. Appel Apify batch unique pour tous les domaines
  const domains = Array.from(prospectDomainMap.keys());
  const apifyBatchResults: Map<string, ApifyCompanyEnrichment> = new Map();

  if (domains.length > 0) {
    try {
      const batchResults = await callApifyActor<ApifyCompanyEnrichment>(
        "george.the.developer/company-enrichment-api",
        { domains },
        120, // Timeout 120s pour le batch
      );

      if (batchResults && batchResults.length > 0) {
        // Mapper les résultats par domaine
        for (const result of batchResults) {
          if (result.domain) {
            apifyBatchResults.set(result.domain.toLowerCase(), result);
          }
        }
      }
    } catch (apifyErr) {
      console.error(
        "[enrichBatch] Erreur Apify batch, fallback individuel:",
        apifyErr,
      );
    }
  }

  // 4. Sauvegarder les résultats Apify pour chaque prospect avec domaine
  for (const [domain, { prospectId }] of prospectDomainMap) {
    const apifyData = apifyBatchResults.get(domain.toLowerCase());

    if (
      apifyData &&
      (apifyData.industry || apifyData.employees || apifyData.tech)
    ) {
      // Données Apify disponibles — sauvegarder directement
      try {
        const enrichmentData = mapApifyToEnrichment(apifyData);
        const prospect = prospects.find((p) => (p.id as string) === prospectId);
        const existingMetadata =
          typeof prospect?.metadata === "object" && prospect?.metadata !== null
            ? (prospect.metadata as Record<string, unknown>)
            : {};

        const updatedMetadata = {
          ...existingMetadata,
          enrichment: {
            ...enrichmentData,
            source: "apify_verified" as const,
            disclaimer:
              "Données vérifiées via Apify (batch company-enrichment-api).",
            enriched_at: new Date().toISOString(),
            enriched_by: user.id,
          },
        };

        const { error: updateError } = await supabase
          .from("prospects")
          .update({ metadata: updatedMetadata })
          .eq("id", prospectId);

        if (!updateError) {
          await supabase.from("activity_logs").insert({
            user_id: user.id,
            action: "enrichment",
            entity_type: "prospect",
            entity_id: prospectId,
            metadata: {
              prospect_name: (prospect?.name as string) || "",
              confiance: enrichmentData.confiance,
              source: "apify_verified",
            },
          });
          success++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    } else {
      // Pas de données Apify pour ce domaine — fallback individuel
      try {
        await enrichProspect(prospectId);
        success++;
      } catch {
        failed++;
      }
    }
  }

  // 5. Fallback IA individuel pour les prospects sans domaine
  for (const prospectId of prospectsWithoutDomain) {
    try {
      await enrichProspect(prospectId);
      success++;
    } catch {
      failed++;
    }
  }

  revalidatePath("/prospecting/enrichment");
  return { success, failed };
}

// ─── getEnrichmentHistory ───────────────────────────────────────────
export async function getEnrichmentHistory() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const { data } = await supabase
    .from("activity_logs")
    .select("*")
    .eq("action", "enrichment")
    .order("created_at", { ascending: false })
    .limit(50);

  return data || [];
}

// ─── generateCompanyInsights ────────────────────────────────────────
export async function generateCompanyInsights(company: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const prompt = `Tu es un expert en intelligence économique et commerciale B2B.
Génère une analyse détaillée de l'entreprise suivante: "${company}"

Génère un JSON avec ces champs:
- nom (string): nom de l'entreprise
- secteur (string): secteur d'activité principal
- taille_estimee (string): estimation de la taille ("1-10", "11-50", "51-200", "201-500", "500+")
- description (string): description courte de l'activité (2-3 phrases)
- concurrents (string[]): 3-5 concurrents principaux
- defis_cles (string[]): 3-5 défis business actuels probables
- opportunites (string[]): 3-5 opportunités commerciales potentielles
- technologies_probables (string[]): technologies probablement utilisées
- budget_potentiel (string): estimation de budget pour des services B2B
- approche_recommandee (string): conseil pour l'approche commerciale
- confiance (number): score de confiance de 0 à 100`;

  try {
    const insights = await aiJSON<{
      nom: string;
      secteur: string;
      taille_estimee: string;
      description: string;
      concurrents: string[];
      defis_cles: string[];
      opportunites: string[];
      technologies_probables: string[];
      budget_potentiel: string;
      approche_recommandee: string;
      confiance: number;
    }>(prompt, {
      system:
        "Tu es un analyste en intelligence commerciale. Réponds uniquement en JSON valide. Sois réaliste dans tes estimations. Si tu ne connais pas l'entreprise, base-toi sur le nom pour deviner le secteur et donne un score de confiance bas.",
      model: "anthropic/claude-3.5-sonnet",
    });

    return {
      ...insights,
      source: "ai_estimation" as const,
      disclaimer:
        "Données estimées par IA, non vérifiées. Aucune source externe n'a été consultée.",
    };
  } catch (aiError) {
    console.error("[generateCompanyInsights] Erreur IA:", aiError);
    throw new Error(
      "L'analyse IA de l'entreprise a échoué. Veuillez réessayer plus tard.",
    );
  }
}

// ─── getProspectsForEnrichment ───────────────────────────────────────
export async function getProspectsForEnrichment() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const { data: prospects } = await supabase
    .from("prospects")
    .select("*")
    .order("created_at", { ascending: false });

  return (prospects || []).map((p: Record<string, unknown>) => {
    const metadata =
      typeof p.metadata === "object" && p.metadata !== null
        ? (p.metadata as Record<string, unknown>)
        : {};
    const enrichment = metadata.enrichment as
      | Record<string, unknown>
      | undefined;

    // Count missing data fields
    const fields = ["email", "company", "notes", "profile_url"];
    const missingCount = fields.filter(
      (f) =>
        !p[f] || (typeof p[f] === "string" && (p[f] as string).trim() === ""),
    ).length;

    return {
      id: p.id as string,
      name: (p.name as string) || "",
      email: (p.email as string) || "",
      company: (p.company as string) || "",
      platform: (p.platform as string) || "",
      profile_url: (p.profile_url as string) || "",
      notes: (p.notes as string) || "",
      status: (p.status as string) || "",
      created_at: (p.created_at as string) || "",
      missing_count: missingCount,
      enrichment: enrichment
        ? {
            secteur: (enrichment.secteur as string) || "",
            taille_entreprise: (enrichment.taille_entreprise as string) || "",
            poste_probable: (enrichment.poste_probable as string) || "",
            budget_estime: (enrichment.budget_estime as string) || "",
            meilleur_moment_contact:
              (enrichment.meilleur_moment_contact as string) || "",
            profil_linkedin_probable:
              (enrichment.profil_linkedin_probable as string) || "",
            profil_twitter_probable:
              (enrichment.profil_twitter_probable as string) || "",
            site_web_probable: (enrichment.site_web_probable as string) || "",
            points_cles: (enrichment.points_cles as string[]) || [],
            confiance: (enrichment.confiance as number) || 0,
            enriched_at: (enrichment.enriched_at as string) || "",
            source: (enrichment.source as string) || "ai_estimation",
            disclaimer:
              (enrichment.disclaimer as string) ||
              "Données estimées par IA, non vérifiées",
          }
        : null,
    };
  });
}
