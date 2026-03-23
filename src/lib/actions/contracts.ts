"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { notify, notifyMany } from "@/lib/actions/notifications";
import { generateInvoice, createInstallmentPlan } from "@/lib/actions/payments";
import { subDays } from "date-fns";

/**
 * Remplace les variables dynamiques {{variable}} dans le contenu du contrat.
 * Variables supportées : client_name, client_email, client_company, amount, date, payment_schedule
 */
function replaceContractVariables(
  content: string,
  variables: Record<string, string>,
): string {
  let result = content;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "gi"), value);
  }
  return result;
}

async function generateContractNumber(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `SA-${year}-`;

  // Get the latest contract number for this year
  const { data } = await supabase
    .from("contracts")
    .select("contract_number")
    .like("contract_number", `${prefix}%`)
    .order("contract_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  let nextNum = 1;
  if (data?.contract_number) {
    const parts = data.contract_number.split("-");
    const lastNum = parseInt(parts[2], 10);
    if (!isNaN(lastNum)) nextNum = lastNum + 1;
  }

  return `${prefix}${String(nextNum).padStart(3, "0")}`;
}

export async function createContract(formData: {
  templateId: string;
  clientId: string;
  dealId?: string;
  content: string;
  amount: number;
  paymentSchedule: string;
  installmentCount?: number;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié", data: null };

  // Empêcher les doublons de contrat pour un même deal
  if (formData.dealId) {
    const { data: existing } = await supabase
      .from("contracts")
      .select("id, status")
      .eq("deal_id", formData.dealId)
      .neq("status", "cancelled")
      .limit(1)
      .maybeSingle();

    if (existing) {
      return {
        error: `Un contrat existe déjà pour ce deal (statut: ${existing.status}). Veuillez d'abord annuler le contrat existant.`,
        data: null,
      };
    }
  }

  // Fetch client profile for variable replacement
  const { data: clientProfile } = await supabase
    .from("profiles")
    .select("full_name, email, company")
    .eq("id", formData.clientId)
    .single();

  const baseVariables: Record<string, string> = {
    client_name: clientProfile?.full_name || "",
    client_email: clientProfile?.email || "",
    client_company: clientProfile?.company || "",
    nom: clientProfile?.full_name?.split(" ").slice(-1)[0] || "",
    prenom: clientProfile?.full_name?.split(" ")[0] || "",
    montant: new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(formData.amount),
    date: new Date().toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
    payment_schedule: formData.paymentSchedule,
    echeances: formData.paymentSchedule,
  };

  // Retry loop to handle concurrent contract number generation (unique constraint)
  let data;
  let lastError;
  for (let attempt = 0; attempt < 5; attempt++) {
    const contractNumber = await generateContractNumber(supabase);

    const variables = { ...baseVariables, contract_number: contractNumber };
    const processedContent = replaceContractVariables(
      formData.content,
      variables,
    );

    const result = await supabase
      .from("contracts")
      .insert({
        contract_number: contractNumber,
        template_id: formData.templateId,
        client_id: formData.clientId,
        deal_id: formData.dealId || null,
        content: processedContent,
        amount: formData.amount,
        payment_schedule: formData.paymentSchedule,
        installment_count: formData.installmentCount || 1,
        status: "draft",
      })
      .select()
      .single();

    if (!result.error) {
      data = result.data;
      lastError = null;
      break;
    }

    // If unique constraint violation, retry with next number
    if (result.error.code === "23505") {
      lastError = result.error;
      continue;
    }

    // Other error — stop retrying
    lastError = result.error;
    break;
  }

  if (lastError) {
    console.error("[createContract] Supabase error:", lastError.message, lastError.code);
    return {
      error:
        lastError.code === "42501"
          ? "Permissions insuffisantes. Contactez l'administrateur pour vérifier les politiques de sécurité (RLS)."
          : "Impossible de créer le contrat. Vérifiez les informations saisies.",
      data: null,
    };
  }
  revalidatePath("/contracts");
  return { error: null, data };
}

export async function sendContract(contractId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  // Vérifier ownership : admin/manager OU assigned_to
  const { data: contract } = await supabase
    .from("contracts")
    .select("*, client:profiles(*)")
    .eq("id", contractId)
    .single();

  if (!contract) return { error: "Contrat introuvable" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isAdminOrManager =
    profile && ["admin", "manager"].includes(profile.role);
  const isAssignedTo = contract.assigned_to === user.id;

  if (!isAdminOrManager && !isAssignedTo) {
    return { error: "Vous n'avez pas la permission d'envoyer ce contrat." };
  }

  const { error } = await supabase
    .from("contracts")
    .update({ status: "sent" })
    .eq("id", contractId);

  if (error) return { error: "Impossible d'envoyer le contrat." };

  if (contract?.client_id) {
    notify(
      contract.client_id,
      "Nouveau contrat à signer",
      "Un contrat vous a été envoyé. Cliquez pour le consulter et le signer.",
      {
        type: "contract",
        link: `/contracts/${contractId}`,
      },
    );
  }

  revalidatePath("/contracts");
  revalidatePath(`/contracts/${contractId}`);
  return { success: true };
}

export async function signContract(contractId: string, signatureData: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const { error } = await supabase
    .from("contracts")
    .update({
      status: "signed",
      signed_at: new Date().toISOString(),
      signature_data: signatureData,
    })
    .eq("id", contractId)
    .eq("client_id", user.id);

  if (error) return { error: "Impossible de signer le contrat." };

  // Notify admin
  const { data: admins } = await supabase
    .from("profiles")
    .select("id")
    .in("role", ["admin", "manager"]);

  if (admins) {
    notifyMany(
      admins.map((a) => a.id),
      "Contrat signé",
      "Un client vient de signer son contrat.",
      {
        type: "contract",
        link: `/contracts/${contractId}`,
      },
    );
  }

  // Auto-update deal to "Fermé (gagné)" stage
  await moveDealToSigned(supabase, contractId);

  revalidatePath("/contracts");
  revalidatePath(`/contracts/${contractId}`);
  return { success: true };
}

async function moveDealToSigned(
  supabase: Awaited<ReturnType<typeof createClient>>,
  contractId: string,
) {
  try {
    const { data: contract } = await supabase
      .from("contracts")
      .select("deal_id")
      .eq("id", contractId)
      .single();

    if (!contract?.deal_id) return;

    const { data: signedStage } = await supabase
      .from("pipeline_stages")
      .select("id")
      .eq("name", "Fermé (gagné)")
      .single();

    if (!signedStage) return;

    await supabase
      .from("deals")
      .update({ stage_id: signedStage.id })
      .eq("id", contract.deal_id);

    revalidatePath("/crm");
  } catch {
    // Non-blocking: deal stage update is best-effort after contract signature
  }
}

export async function savePdfUrl(contractId: string, pdfUrl: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  if (!pdfUrl || pdfUrl.trim().length === 0) {
    return { error: "URL du PDF invalide" };
  }

  // Vérifier ownership : admin/manager OU assigned_to
  const { data: contract } = await supabase
    .from("contracts")
    .select("assigned_to")
    .eq("id", contractId)
    .single();

  if (!contract) return { error: "Contrat introuvable" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isAdminOrManager =
    profile && ["admin", "manager"].includes(profile.role);
  const isAssignedTo = contract.assigned_to === user.id;

  if (!isAdminOrManager && !isAssignedTo) {
    return {
      error: "Vous n'avez pas la permission de modifier ce contrat.",
    };
  }

  const { error } = await supabase
    .from("contracts")
    .update({ pdf_url: pdfUrl })
    .eq("id", contractId);

  if (error) return { error: "Impossible de sauvegarder le PDF." };
  return { success: true };
}

export async function saveSignature(
  contractId: string,
  signatureData: string,
  signerName: string,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const { data: contract } = await supabase
    .from("contracts")
    .select("id, status, client_id")
    .eq("id", contractId)
    .single();

  if (!contract) return { error: "Contrat introuvable" };
  if (contract.status === "signed")
    return { error: "Ce contrat est déjà signé" };
  if (contract.status === "client_signed")
    return {
      error:
        "Ce contrat est déjà signé par le client, en attente de contre-signature",
    };

  // Déterminer si le signataire est le client ou un admin/manager
  const isClientSigner = contract.client_id === user.id;
  const newStatus = isClientSigner ? "client_signed" : "signed";

  const { error } = await supabase
    .from("contracts")
    .update({
      status: newStatus,
      signed_at: new Date().toISOString(),
      signature_data: signatureData,
      signer_name: signerName,
      signer_user_id: user.id,
    })
    .eq("id", contractId);

  if (error) return { error: "Impossible de sauvegarder la signature." };

  if (isClientSigner) {
    // Client a signé → notifier les admins pour contre-signature
    const { data: admins } = await supabase
      .from("profiles")
      .select("id")
      .in("role", ["admin", "manager"]);

    if (admins) {
      notifyMany(
        admins.map((a) => a.id),
        "Contrat signé par le client — contre-signature requise",
        `Le contrat a été signé par ${signerName}. Veuillez contre-signer pour finaliser.`,
        {
          type: "contract",
          link: `/contracts/${contractId}`,
        },
      );
    }
  } else {
    // Admin/manager signe directement → flux classique (contrats non-academy)
    const { data: admins } = await supabase
      .from("profiles")
      .select("id")
      .in("role", ["admin", "manager"]);

    if (admins) {
      notifyMany(
        admins.map((a) => a.id),
        "Contrat signé",
        `Le contrat a été signé par ${signerName}.`,
        {
          type: "contract",
          link: `/contracts/${contractId}`,
        },
      );
    }

    // Auto-update deal et génération facture uniquement quand le contrat est "signed"
    await moveDealToSigned(supabase, contractId);

    const { data: signedContract } = await supabase
      .from("contracts")
      .select("amount, installment_count")
      .eq("id", contractId)
      .single();

    if (signedContract?.amount) {
      try {
        await generateInvoice(contractId, signedContract.amount);
        const installments = signedContract.installment_count || 1;
        if (installments > 1) {
          await createInstallmentPlan({
            contractId,
            totalAmount: signedContract.amount,
            installmentCount: installments,
          });
        }
      } catch {
        // Non-blocking — signature is already saved
      }
    }
  }

  revalidatePath("/contracts");
  revalidatePath(`/contracts/${contractId}`);
  return { success: true };
}

export async function getSignatureStatus(contractId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const { data: contract, error } = await supabase
    .from("contracts")
    .select(
      "id, status, signed_at, signature_data, signer_name, signer_user_id",
    )
    .eq("id", contractId)
    .single();

  if (error || !contract) return { error: "Contrat introuvable" };

  return {
    isSigned: contract.status === "signed",
    signerName: contract.signer_name || null,
    signedAt: contract.signed_at || null,
    signatureData: contract.signature_data || null,
    signerUserId: contract.signer_user_id || null,
  };
}

export async function revokeSignature(contractId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  // Check admin role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "manager"].includes(profile.role)) {
    return { error: "Action réservée aux administrateurs" };
  }

  // Get deal_id before revoking, to revert deal stage
  const { data: contractData } = await supabase
    .from("contracts")
    .select("deal_id")
    .eq("id", contractId)
    .single();

  const { error } = await supabase
    .from("contracts")
    .update({
      status: "draft",
      signed_at: null,
      signature_data: null,
      signer_name: null,
      signer_user_id: null,
    })
    .eq("id", contractId);

  if (error) return { error: "Impossible de révoquer la signature." };

  // Revert deal stage back to "Call booké" if linked
  if (contractData?.deal_id) {
    try {
      const { data: propositionStage } = await supabase
        .from("pipeline_stages")
        .select("id")
        .eq("name", "Call booké")
        .single();

      if (propositionStage) {
        await supabase
          .from("deals")
          .update({ stage_id: propositionStage.id })
          .eq("id", contractData.deal_id);
        revalidatePath("/crm");
      }
    } catch {
      // Non-blocking
    }
  }

  revalidatePath("/contracts");
  revalidatePath(`/contracts/${contractId}`);
  return { success: true };
}

// ─── Expiration automatique des contrats inactifs ─────────────────

/**
 * Passe les contrats "draft" ou "sent" créés il y a plus de 30 jours
 * au statut "expired". Notifie le client et les admins/managers.
 * Peut être appelée depuis un cron ou manuellement.
 */
export async function expireStaleContracts() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié", count: 0 };

  const thirtyDaysAgo = subDays(new Date(), 30).toISOString();

  // Récupérer les contrats éligibles à l'expiration
  const { data: staleContracts, error: fetchError } = await supabase
    .from("contracts")
    .select("id, client_id, status")
    .in("status", ["draft", "sent"])
    .lt("created_at", thirtyDaysAgo)
    .limit(500);

  if (fetchError || !staleContracts || staleContracts.length === 0) {
    return { error: fetchError?.message || null, count: 0 };
  }

  // Marquer comme expirés
  const staleIds = staleContracts.map((c) => c.id);
  const { error: updateError } = await supabase
    .from("contracts")
    .update({ status: "expired" })
    .in("id", staleIds);

  if (updateError) return { error: updateError.message, count: 0 };

  // Récupérer les admins/managers une seule fois (évite N+1)
  const { data: admins } = await supabase
    .from("profiles")
    .select("id")
    .in("role", ["admin", "manager"]);

  const adminIds = admins?.map((a) => a.id) || [];

  // Notifier pour chaque contrat expiré
  for (const contract of staleContracts) {
    if (contract.client_id) {
      notify(
        contract.client_id,
        "Contrat expiré",
        `Votre contrat #${contract.id.slice(0, 8)} a expiré car il n'a pas été signé dans les 30 jours.`,
        {
          type: "contract_expired",
          link: `/contracts/${contract.id}`,
        },
      );
    }

    if (adminIds.length > 0) {
      notifyMany(
        adminIds,
        "Contrat expiré automatiquement",
        `Le contrat #${contract.id.slice(0, 8)} (était "${contract.status}") a expiré après 30 jours sans signature.`,
        {
          type: "contract_expired",
          link: `/contracts/${contract.id}`,
        },
      );
    }
  }

  revalidatePath("/contracts");
  return { error: null, count: staleContracts.length };
}

// ─── Contrat Academy B2C ────────────────────────────────────────────

const ACADEMY_CONTRACT_CONTENT = `# CONTRAT D'ACCOMPAGNEMENT
## Formation et Placement — Métier de Setter

---

## ENTRE LES SOUSSIGNÉS

**LE PRESTATAIRE**
SalesSystem Academy
Siège social : 18 allée des bergeronnettes
Représenté par Damien REYNAUD, en qualité de Président
Ci-après dénommé « SalesSystem Academy » ou « le Prestataire »

**LE CLIENT**
Nom et Prénom : {{client_name}}
Adresse : {{client_address}}
Code postal et Ville : {{client_city}}
Téléphone : {{client_phone}}

---

## PRÉAMBULE

SalesSystem Academy est spécialisé dans la formation professionnelle au métier de setter (prise de rendez-vous qualifiés pour des entrepreneurs) et le placement de ses élèves formés dans des entreprises partenaires générant entre 10 000 et 200 000 euros de chiffre d'affaires mensuel.

Le Client souhaite bénéficier de cet accompagnement complet pour développer ses compétences en setting et être placé dans une entreprise partenaire.

---

## ARTICLE 1 — OBJET DU CONTRAT

Le présent contrat a pour objet de définir les conditions dans lesquelles SalesSystem Academy s'engage à :
- Former le Client au métier de setter jusqu'à ce qu'il soit compétent et opérationnel pour exercer cette activité professionnellement
- Placer le Client dans une entreprise partenaire générant entre 10 000 et 200 000 euros de chiffre d'affaires mensuel, dès lors que le Client aura atteint le niveau de compétence requis

## ARTICLE 2 — DESCRIPTIF DE L'ACCOMPAGNEMENT

**2.1 Formation au métier de setter**

La formation comprend :
- Les fondamentaux du métier de setter et la psychologie de la vente
- Les techniques de qualification de prospects en outbound (prospection sortante) et inbound (gestion de leads entrants)
- Le copywriting appliqué aux messages et appels de qualification
- La gestion des premiers appels et la prise de rendez-vous qualifiés
- L'accès aux templates, scripts et ressources nécessaires à l'exercice du métier
- Un accompagnement personnalisé pendant toute la durée de la formation jusqu'à l'atteinte du niveau de compétence requis

**2.2 Placement en entreprise**

Une fois le niveau de compétence requis atteint, SalesSystem Academy s'engage à placer le Client dans une entreprise partenaire répondant aux critères suivants :
- Chiffre d'affaires mensuel compris entre 10 000 et 200 000 euros
- Rémunération du Client sur la base d'une commission comprise entre 10% et 15% du chiffre d'affaires généré par ses prises de rendez-vous, plus un fixe de départ entre 200 et 300 euros
- Contrat de collaboration directement établi entre le Client et l'entreprise partenaire

## ARTICLE 3 — OBLIGATIONS DU CLIENT

Le Client s'engage à :
- Suivre assidûment la formation et mettre en application les enseignements dispensés
- Consacrer le temps nécessaire à l'apprentissage et à la pratique (minimum 2 à 4 heures par jour recommandées)
- Être disponible pour commencer à travailler avec l'entreprise partenaire une fois le placement effectué
- Respecter les engagements pris avec l'entreprise partenaire lors du placement
- Communiquer de manière transparente avec SalesSystem Academy sur ses difficultés

## ARTICLE 4 — DURÉE DE L'ACCOMPAGNEMENT

Le présent contrat prend effet à la date de signature des deux parties. La durée de la formation est variable selon le niveau de départ du Client et son investissement personnel. SalesSystem Academy s'engage à accompagner le Client jusqu'à ce qu'il atteigne le niveau de compétence requis pour être placé en entreprise.

Le placement en entreprise interviendra dès que le Client sera jugé compétent par SalesSystem Academy.

## ARTICLE 5 — TARIF ET MODALITÉS DE PAIEMENT

**5.1 Tarif de l'accompagnement**

Le tarif de l'accompagnement complet (formation + placement) est fixé à **2 000 € TTC**.

**5.2 Modalités de paiement**

Le Client choisit de régler le montant total selon l'échéancier défini conjointement entre les parties.

Montant par versement : {{payment_amount}}
Nombre de versements : {{payment_count}}
Mode de paiement : {{payment_method}}

En cas de retard de paiement, des pénalités de retard au taux de 3 fois le taux d'intérêt légal seront appliquées, ainsi qu'une indemnité forfaitaire de 40 euros pour frais de recouvrement.

## ARTICLE 6 — GARANTIES

**6.1 Garantie de formation**

SalesSystem Academy garantit de former le Client jusqu'à ce qu'il atteigne le niveau de compétence requis pour exercer le métier de setter de manière professionnelle. L'accompagnement se poursuivra aussi longtemps que nécessaire, sans limitation de durée, jusqu'à l'atteinte de cet objectif.

**6.2 Garantie de placement**

SalesSystem Academy s'engage à placer le Client dans une entreprise partenaire générant entre 10 000 et 200 000 euros de chiffre d'affaires mensuel, dès lors que :
- Le Client a atteint le niveau de compétence requis, validé par SalesSystem Academy
- Le Client est disponible et en capacité de commencer à travailler
- Le Client respecte les critères de sélection des entreprises partenaires

Cette garantie de placement ne constitue pas une garantie de résultats financiers.

## ARTICLE 7 — DROIT DE RÉTRACTATION

Conformément à l'article L.221-18 du Code de la consommation, le Client dispose d'un délai de rétractation de 14 jours à compter de la signature du présent contrat.

En cas d'exercice de ce droit de rétractation, le Client sera remboursé intégralement des sommes déjà versées, sous déduction des prestations déjà effectivement fournies.

## ARTICLE 8 — RÉSILIATION

**8.1 Résiliation par le Client**

Le Client peut résilier le contrat à tout moment. Dans ce cas, les sommes déjà versées resteront acquises à SalesSystem Academy au titre des prestations déjà fournies, et les sommes restant dues devront être réglées intégralement.

**8.2 Résiliation par SalesSystem Academy**

SalesSystem Academy peut résilier le contrat de plein droit, sans préavis ni indemnité, en cas de :
- Non-respect des obligations du Client mentionnées à l'article 3
- Comportement inapproprié ou irrespectueux du Client envers SalesSystem Academy ou ses partenaires
- Non-paiement d'une échéance après mise en demeure restée sans effet pendant 15 jours

## ARTICLE 9 — CONFIDENTIALITÉ

Les parties s'engagent à conserver confidentielles toutes les informations échangées dans le cadre du présent contrat, notamment les contenus de formation, les techniques enseignées, et les informations relatives aux entreprises partenaires.

## ARTICLE 10 — PROPRIÉTÉ INTELLECTUELLE

Tous les contenus de formation, supports, templates, scripts et ressources fournis par SalesSystem Academy restent la propriété exclusive de SalesSystem Academy. Le Client s'engage à ne pas les reproduire, les diffuser ou les commercialiser sans autorisation écrite préalable.

## ARTICLE 11 — PROTECTION DES DONNÉES PERSONNELLES

Les données personnelles du Client sont collectées et traitées par SalesSystem Academy dans le respect du Règlement Général sur la Protection des Données (RGPD). Le Client dispose d'un droit d'accès, de rectification et de suppression de ses données.

## ARTICLE 12 — LITIGES

En cas de différend, les parties s'efforceront de trouver une solution amiable. À défaut, le tribunal compétent sera celui du siège social du Prestataire.

---

## SIGNATURES

Fait en deux exemplaires originaux.

À Marseille, le : {{date}}`;

/**
 * Crée le contrat Academy pour un utilisateur B2C s'il n'en a pas encore.
 * Appelée automatiquement lors de l'onboarding ou de l'accès à l'Academy.
 */
export async function ensureAcademyContract(userId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié", data: null };

  // Vérifier si un contrat Academy existe déjà pour cet utilisateur
  const { data: existing } = await supabase
    .from("contracts")
    .select("id, status")
    .eq("client_id", userId)
    .ilike("content", "%CONTRAT D'ACCOMPAGNEMENT%")
    .neq("status", "expired")
    .limit(1)
    .maybeSingle();

  if (existing) {
    return { error: null, data: existing };
  }

  // Récupérer le profil client pour les variables
  const { data: clientProfile } = await supabase
    .from("profiles")
    .select("full_name, email, phone")
    .eq("id", userId)
    .single();

  const variables: Record<string, string> = {
    client_name: clientProfile?.full_name || "",
    client_address: "",
    client_city: "",
    client_phone: clientProfile?.phone || "",
    payment_amount: "À définir",
    payment_count: "À définir",
    payment_method: "À définir",
    date: new Date().toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
  };

  const processedContent = replaceContractVariables(
    ACADEMY_CONTRACT_CONTENT,
    variables,
  );

  // Retry loop to handle concurrent contract number generation (unique constraint)
  let data;
  let lastError;
  for (let attempt = 0; attempt < 5; attempt++) {
    const contractNumber = await generateContractNumber(supabase);

    const result = await supabase
      .from("contracts")
      .insert({
        contract_number: contractNumber,
        client_id: userId,
        content: processedContent,
        amount: 2000,
        payment_schedule: "À définir",
        installment_count: 1,
        status: "sent",
      })
      .select()
      .single();

    if (!result.error) {
      data = result.data;
      lastError = null;
      break;
    }

    if (result.error.code === "23505") {
      lastError = result.error;
      continue;
    }

    lastError = result.error;
    break;
  }

  if (lastError || !data) {
    return {
      error: "Impossible de créer le contrat Academy.",
      data: null,
    };
  }

  // Notifier le client
  notify(
    userId,
    "Contrat Academy à signer",
    "Votre contrat d'accompagnement est prêt. Veuillez le consulter et le signer.",
    {
      type: "contract",
      link: `/contracts/${data.id}`,
    },
  );

  revalidatePath("/contracts");
  return { error: null, data };
}

// ─── Contre-signature admin ─────────────────────────────────────────

/**
 * Permet à un admin de contre-signer un contrat déjà signé par le client
 * (statut "client_signed"). Passe le contrat en "signed", génère la facture,
 * met à jour le deal, et notifie le client.
 */
export async function countersignContract(
  contractId: string,
  signatureData: string,
  signerName: string,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  // Vérifier le rôle admin/manager
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "manager"].includes(profile.role)) {
    return { error: "Action réservée aux administrateurs" };
  }

  // Récupérer le contrat et vérifier le statut
  const { data: contract } = await supabase
    .from("contracts")
    .select("id, status, client_id, amount, installment_count")
    .eq("id", contractId)
    .single();

  if (!contract) return { error: "Contrat introuvable" };
  if (contract.status !== "client_signed") {
    return {
      error: `Impossible de contre-signer : le contrat est au statut "${contract.status}". Il doit être en "client_signed".`,
    };
  }

  // Mettre à jour le contrat : statut "signed" + stocker la contre-signature admin dans metadata
  const { error: updateError } = await supabase
    .from("contracts")
    .update({
      status: "signed",
      metadata: {
        admin_signature: signatureData,
        admin_signer_name: signerName,
        admin_signed_at: new Date().toISOString(),
      },
    })
    .eq("id", contractId);

  if (updateError) {
    // Fallback : si la colonne metadata n'existe pas, mettre à jour uniquement le statut
    const { error: fallbackError } = await supabase
      .from("contracts")
      .update({ status: "signed" })
      .eq("id", contractId);

    if (fallbackError) {
      return { error: "Impossible de contre-signer le contrat." };
    }
  }

  // Notifier le client
  if (contract.client_id) {
    notify(
      contract.client_id,
      "Contrat finalisé",
      "Votre contrat a été contre-signé par l'équipe. Il est désormais pleinement effectif.",
      {
        type: "contract",
        link: `/contracts/${contractId}`,
      },
    );
  }

  // Auto-update deal to "Fermé (gagné)" stage
  await moveDealToSigned(supabase, contractId);

  // Auto-generate invoice on final signature
  if (contract.amount) {
    try {
      await generateInvoice(contractId, contract.amount);
      const installments = contract.installment_count || 1;
      if (installments > 1) {
        await createInstallmentPlan({
          contractId,
          totalAmount: contract.amount,
          installmentCount: installments,
        });
      }
    } catch {
      // Non-blocking — contre-signature déjà enregistrée
    }
  }

  revalidatePath("/contracts");
  revalidatePath(`/contracts/${contractId}`);
  return { success: true };
}
