"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { notify } from "@/lib/actions/notifications";
import { updateClientSops, type SopData } from "@/lib/actions/sops";

// ─── Types ───────────────────────────────────────────────────────────

export interface EsopContent {
  // Section "Votre offre"
  nom_offre: string;
  prix_range: string;
  duree_accompagnement: string;
  ce_que_client_obtient: string;
  transformations_promises: string[];
  // Section "Votre cible"
  description_client_ideal: string;
  tranche_age: string;
  situation_professionnelle: string;
  plateforme_principale: string;
  exemples_clients_signes: string;
  // Section "Votre contexte"
  anciennete_vente: string;
  nombre_clients_total: string;
  messages_qui_fonctionnent: string;
  objections_frequentes: string;
  // Section "Exemples de conversations"
  screenshots_urls: string[];
  // Section "Objectifs setting"
  volume_messages_jour: string;
  calls_par_semaine: string;
  budget_pub: string;
}

export interface EsopSubmission {
  id: string;
  workspace_id: string | null;
  entrepreneur_id: string;
  status: "brouillon" | "soumis" | "en_revision" | "valide";
  content: EsopContent;
  submitted_at: string | null;
  validated_at: string | null;
  validated_by: string | null;
  revision_comments: string | null;
  created_at: string;
  updated_at: string;
  entrepreneur?: {
    full_name: string | null;
    email: string;
    company: string | null;
  };
}

const EMPTY_CONTENT: EsopContent = {
  nom_offre: "",
  prix_range: "",
  duree_accompagnement: "",
  ce_que_client_obtient: "",
  transformations_promises: ["", "", ""],
  description_client_ideal: "",
  tranche_age: "",
  situation_professionnelle: "",
  plateforme_principale: "",
  exemples_clients_signes: "",
  anciennete_vente: "",
  nombre_clients_total: "",
  messages_qui_fonctionnent: "",
  objections_frequentes: "",
  screenshots_urls: [],
  volume_messages_jour: "",
  calls_par_semaine: "",
  budget_pub: "",
};

// ─── Entrepreneur Actions ────────────────────────────────────────────

/**
 * Get or create ESOP for the current entrepreneur.
 */
export async function getMyEsop(): Promise<{
  data: EsopSubmission | null;
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Non authentifié" };

  const { data: existing } = await supabase
    .from("esop_submissions")
    .select("*")
    .eq("entrepreneur_id", user.id)
    .single();

  if (existing) {
    return {
      data: {
        ...existing,
        content: { ...EMPTY_CONTENT, ...(existing.content as object) },
      } as EsopSubmission,
    };
  }

  // Create a new draft
  const { data: newEsop, error } = await supabase
    .from("esop_submissions")
    .insert({
      entrepreneur_id: user.id,
      workspace_id: user.id,
      status: "brouillon",
      content: EMPTY_CONTENT,
    })
    .select("*")
    .single();

  if (error) return { data: null, error: error.message };

  return { data: newEsop as EsopSubmission };
}

/**
 * Save ESOP as draft.
 */
export async function saveEsopDraft(
  content: Partial<EsopContent>,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const { data: existing } = await supabase
    .from("esop_submissions")
    .select("content, status")
    .eq("entrepreneur_id", user.id)
    .single();

  if (existing?.status === "valide") {
    return { error: "L'ESOP a déjà été validé et ne peut plus être modifié" };
  }

  const merged = { ...EMPTY_CONTENT, ...(existing?.content as object || {}), ...content };

  const { error } = await supabase
    .from("esop_submissions")
    .update({
      content: merged,
      status: existing?.status === "en_revision" ? "en_revision" : "brouillon",
      updated_at: new Date().toISOString(),
    })
    .eq("entrepreneur_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/portal/esop");
  return {};
}

/**
 * Submit ESOP for validation.
 */
export async function submitEsop(): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const { error } = await supabase
    .from("esop_submissions")
    .update({
      status: "soumis",
      submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("entrepreneur_id", user.id);

  if (error) return { error: error.message };

  // Notify admins
  const { data: admins } = await supabase
    .from("profiles")
    .select("id")
    .in("role", ["admin", "manager"]);

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, company")
    .eq("id", user.id)
    .single();

  for (const admin of admins || []) {
    await notify(
      admin.id,
      "Nouvel ESOP soumis",
      `${profile?.full_name || profile?.company || "Un entrepreneur"} a soumis son ESOP pour validation`,
      { link: "/settings/workspaces", type: "esop_submitted" },
    );
  }

  revalidatePath("/portal/esop");
  return {};
}

// ─── Admin Actions ───────────────────────────────────────────────────

/**
 * Get all ESOP submissions (admin).
 */
export async function getAllEsops(): Promise<EsopSubmission[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "manager"].includes(profile.role)) return [];

  const { data } = await supabase
    .from("esop_submissions")
    .select("*, entrepreneur:profiles!esop_submissions_entrepreneur_id_fkey(full_name, email, company)")
    .order("updated_at", { ascending: false });

  return (data || []).map((e) => ({
    ...e,
    content: { ...EMPTY_CONTENT, ...(e.content as object) },
    entrepreneur: Array.isArray(e.entrepreneur)
      ? e.entrepreneur[0]
      : e.entrepreneur,
  })) as EsopSubmission[];
}

/**
 * Validate an ESOP and pre-fill SOPs.
 */
export async function validateEsop(
  esopId: string,
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

  if (!profile || !["admin", "manager"].includes(profile.role)) {
    return { error: "Accès refusé" };
  }

  const { data: esop } = await supabase
    .from("esop_submissions")
    .select("*")
    .eq("id", esopId)
    .single();

  if (!esop) return { error: "ESOP introuvable" };

  // Update status
  const { error } = await supabase
    .from("esop_submissions")
    .update({
      status: "valide",
      validated_at: new Date().toISOString(),
      validated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", esopId);

  if (error) return { error: error.message };

  // Pre-fill SOPs from ESOP data
  const content = { ...EMPTY_CONTENT, ...(esop.content as object) } as EsopContent;
  const sopUpdate: Partial<SopData> = {
    contexte_business: {
      entreprise: "",
      secteur: "",
      offre: content.nom_offre,
      probleme_resolu: content.ce_que_client_obtient,
      cible_client: content.description_client_ideal,
      ca_mensuel: "",
      plateforme_principale: content.plateforme_principale,
    },
    avatar_client: {
      age_situation: content.tranche_age + (content.situation_professionnelle ? " — " + content.situation_professionnelle : ""),
      douleurs_principales: "",
      objections_frequentes: content.objections_frequentes,
      motivations: "",
      langage_utilise: "",
    },
  };

  await updateClientSops(esop.entrepreneur_id, sopUpdate);

  // Notify entrepreneur
  await notify(
    esop.entrepreneur_id,
    "ESOP validé !",
    "Votre ESOP a été validé par l'équipe. Vos SOPs ont été pré-remplis.",
    { link: "/portal/sops", type: "esop_validated" },
  );

  revalidatePath("/settings/workspaces");
  revalidatePath("/portal/esop");
  return {};
}

/**
 * Request revisions on an ESOP.
 */
export async function requestEsopRevision(
  esopId: string,
  comments: string,
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

  if (!profile || !["admin", "manager"].includes(profile.role)) {
    return { error: "Accès refusé" };
  }

  const { data: esop } = await supabase
    .from("esop_submissions")
    .select("entrepreneur_id")
    .eq("id", esopId)
    .single();

  if (!esop) return { error: "ESOP introuvable" };

  const { error } = await supabase
    .from("esop_submissions")
    .update({
      status: "en_revision",
      revision_comments: comments,
      updated_at: new Date().toISOString(),
    })
    .eq("id", esopId);

  if (error) return { error: error.message };

  await notify(
    esop.entrepreneur_id,
    "ESOP : révisions demandées",
    `L'équipe a demandé des modifications sur votre ESOP : ${comments.slice(0, 100)}`,
    { link: "/portal/esop", type: "esop_revision" },
  );

  revalidatePath("/settings/workspaces");
  revalidatePath("/portal/esop");
  return {};
}
