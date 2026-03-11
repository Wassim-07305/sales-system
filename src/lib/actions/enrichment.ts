"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { aiJSON } from "@/lib/ai/client";

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
  };

  try {
    enrichmentData = await aiJSON<typeof enrichmentData>(prompt, {
      system:
        "Tu es un assistant d'enrichissement de données commerciales. Réponds uniquement en JSON valide. Base tes estimations sur les indices disponibles (nom, email, entreprise). Sois réaliste et indique un score de confiance honnête.",
    });
  } catch (aiError) {
    console.error("[enrichProspect] Erreur IA:", aiError);
    throw new Error("L'enrichissement IA a échoué. Veuillez réessayer plus tard.");
  }

  // Save enrichment data to prospect metadata
  const existingMetadata =
    typeof prospect.metadata === "object" && prospect.metadata !== null
      ? (prospect.metadata as Record<string, unknown>)
      : {};

  const updatedMetadata = {
    ...existingMetadata,
    enrichment: {
      ...enrichmentData,
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
    },
  });

  revalidatePath("/prospecting/enrichment");
  return enrichmentData;
}

// ─── enrichBatch ────────────────────────────────────────────────────
export async function enrichBatch(prospectIds: string[]) {
  if (prospectIds.length === 0) return { success: 0, failed: 0 };
  // Limit to 10 at a time
  const ids = prospectIds.slice(0, 10);

  let success = 0;
  let failed = 0;

  for (const id of ids) {
    try {
      await enrichProspect(id);
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

    return insights;
  } catch (aiError) {
    console.error("[generateCompanyInsights] Erreur IA:", aiError);
    throw new Error("L'analyse IA de l'entreprise a échoué. Veuillez réessayer plus tard.");
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
    const enrichment = metadata.enrichment as Record<string, unknown> | undefined;

    // Count missing data fields
    const fields = ["email", "company", "notes", "profile_url"];
    const missingCount = fields.filter(
      (f) => !p[f] || (typeof p[f] === "string" && (p[f] as string).trim() === "")
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
            meilleur_moment_contact: (enrichment.meilleur_moment_contact as string) || "",
            profil_linkedin_probable: (enrichment.profil_linkedin_probable as string) || "",
            profil_twitter_probable: (enrichment.profil_twitter_probable as string) || "",
            site_web_probable: (enrichment.site_web_probable as string) || "",
            points_cles: (enrichment.points_cles as string[]) || [],
            confiance: (enrichment.confiance as number) || 0,
            enriched_at: (enrichment.enriched_at as string) || "",
          }
        : null,
    };
  });
}
