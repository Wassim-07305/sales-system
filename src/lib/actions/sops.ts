"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// ─── Types ───────────────────────────────────────────────────────────

export interface SopContexteBusiness {
  entreprise: string;
  secteur: string;
  offre: string;
  probleme_resolu: string;
  cible_client: string;
  ca_mensuel: string;
  plateforme_principale: string;
}

export interface SopAvatarClient {
  age_situation: string;
  douleurs_principales: string;
  objections_frequentes: string;
  motivations: string;
  langage_utilise: string;
}

export interface SopChampLexical {
  termes: Array<{ mot: string; definition: string }>;
}

export interface SopSourcing {
  canaux: Array<{
    nom: string;
    strategie: string;
    criteres_ciblage: string;
    volume_quotidien: string;
  }>;
}

export interface SopScript {
  id: string;
  nom: string;
  plateforme: "instagram" | "linkedin" | "whatsapp";
  type: "premier_contact" | "relance_j2" | "relance_j3" | "objection";
  contenu: string;
}

export interface SopData {
  contexte_business: SopContexteBusiness;
  avatar_client: SopAvatarClient;
  champ_lexical: SopChampLexical;
  sourcing: SopSourcing;
  scripts: SopScript[];
  comments?: Array<{
    section: string;
    author_id: string;
    author_name: string;
    content: string;
    created_at: string;
  }>;
}

const DEFAULT_SOP_DATA: SopData = {
  contexte_business: {
    entreprise: "",
    secteur: "",
    offre: "",
    probleme_resolu: "",
    cible_client: "",
    ca_mensuel: "",
    plateforme_principale: "",
  },
  avatar_client: {
    age_situation: "",
    douleurs_principales: "",
    objections_frequentes: "",
    motivations: "",
    langage_utilise: "",
  },
  champ_lexical: {
    termes: [
      { mot: "setter", definition: "Personne qui qualifie les prospects et prend les RDV" },
      { mot: "closer", definition: "Personne qui conclut la vente lors de l'appel" },
      { mot: "deal", definition: "Opportunité commerciale en cours" },
      { mot: "call", definition: "Appel téléphonique ou visio de vente" },
      { mot: "pipeline", definition: "Ensemble des étapes du processus de vente" },
      { mot: "lead", definition: "Contact potentiellement intéressé par l'offre" },
    ],
  },
  sourcing: {
    canaux: [
      { nom: "Instagram", strategie: "", criteres_ciblage: "", volume_quotidien: "" },
      { nom: "LinkedIn", strategie: "", criteres_ciblage: "", volume_quotidien: "" },
      { nom: "WhatsApp", strategie: "", criteres_ciblage: "", volume_quotidien: "" },
    ],
  },
  scripts: [],
  comments: [],
};

// ─── Actions ─────────────────────────────────────────────────────────

/**
 * Get SOPs for a client. Creates default if none exist.
 */
export async function getClientSops(clientId: string): Promise<{
  data: SopData | null;
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Non authentifié" };

  // Check permissions — admin/manager/csm can see any, entrepreneur sees own
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile) return { data: null, error: "Profil introuvable" };

  const isAdmin = ["admin", "manager", "csm"].includes(profile.role);
  if (!isAdmin && user.id !== clientId) {
    // Check if setter assigned to this entrepreneur
    const { data: setterProfile } = await supabase
      .from("profiles")
      .select("matched_entrepreneur_id")
      .eq("id", user.id)
      .single();
    if (setterProfile?.matched_entrepreneur_id !== clientId) {
      return { data: null, error: "Accès refusé" };
    }
  }

  const { data: sop } = await supabase
    .from("client_sops")
    .select("sop_data")
    .eq("client_id", clientId)
    .single();

  if (sop?.sop_data) {
    return { data: { ...DEFAULT_SOP_DATA, ...(sop.sop_data as object) } as SopData };
  }

  return { data: DEFAULT_SOP_DATA };
}

/**
 * Save/update SOPs for a client. Admin/manager/CSM only for editing.
 */
export async function updateClientSops(
  clientId: string,
  sopData: Partial<SopData>,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "manager", "csm"].includes(profile.role)) {
    return { error: "Accès refusé — seuls les admins/CSM peuvent modifier les SOPs" };
  }

  // Get existing data to merge
  const { data: existing } = await supabase
    .from("client_sops")
    .select("sop_data")
    .eq("client_id", clientId)
    .single();

  const merged = {
    ...DEFAULT_SOP_DATA,
    ...(existing?.sop_data as object || {}),
    ...sopData,
  };

  const { error } = await supabase.from("client_sops").upsert(
    {
      client_id: clientId,
      sop_data: merged,
      generated_at: new Date().toISOString(),
    },
    { onConflict: "client_id" },
  );

  if (error) return { error: error.message };

  revalidatePath("/portal/sops");
  revalidatePath("/settings/workspaces");
  return {};
}

/**
 * Add a comment on a SOP section (entrepreneur can do this).
 */
export async function addSopComment(
  clientId: string,
  section: string,
  content: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  if (!profile) return { error: "Profil introuvable" };

  // Entrepreneur can comment on own SOPs, admin/csm on any
  const isAdmin = ["admin", "manager", "csm"].includes(profile.role);
  if (!isAdmin && user.id !== clientId) {
    return { error: "Accès refusé" };
  }

  const { data: existing } = await supabase
    .from("client_sops")
    .select("sop_data")
    .eq("client_id", clientId)
    .single();

  const sopData = {
    ...DEFAULT_SOP_DATA,
    ...(existing?.sop_data as object || {}),
  } as SopData;

  const comments = sopData.comments || [];
  comments.push({
    section,
    author_id: user.id,
    author_name: profile.full_name || "Utilisateur",
    content,
    created_at: new Date().toISOString(),
  });

  const { error } = await supabase.from("client_sops").upsert(
    {
      client_id: clientId,
      sop_data: { ...sopData, comments },
      generated_at: new Date().toISOString(),
    },
    { onConflict: "client_id" },
  );

  if (error) return { error: error.message };

  revalidatePath("/portal/sops");
  return {};
}

/**
 * Pre-fill SOP contexte_business from onboarding data.
 */
export async function prefillSopFromOnboarding(
  clientId: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  // Get onboarding data from user_settings
  const { data: settings } = await supabase
    .from("user_settings")
    .select("key, value")
    .eq("user_id", clientId);

  if (!settings?.length) return { error: "Aucune donnée d'onboarding trouvée" };

  const settingsMap = Object.fromEntries(
    settings.map((s) => [s.key, s.value]),
  );

  // Get client profile for company name
  const { data: clientProfile } = await supabase
    .from("profiles")
    .select("company, niche")
    .eq("id", clientId)
    .single();

  const contexte: SopContexteBusiness = {
    entreprise: clientProfile?.company || "",
    secteur: clientProfile?.niche || settingsMap.business_description || "",
    offre: settingsMap.business_description || "",
    probleme_resolu: "",
    cible_client: settingsMap.qualification_questions || "",
    ca_mensuel: "",
    plateforme_principale: "",
  };

  // Parse prospection channels
  try {
    const channels = JSON.parse(settingsMap.prospection_channels || "[]");
    if (Array.isArray(channels) && channels.length > 0) {
      contexte.plateforme_principale = channels[0];
    }
  } catch {
    // ignore
  }

  return updateClientSops(clientId, { contexte_business: contexte });
}
