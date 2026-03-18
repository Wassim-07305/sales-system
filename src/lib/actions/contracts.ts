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

  const contractNumber = await generateContractNumber(supabase);

  const variables: Record<string, string> = {
    contract_number: contractNumber,
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

  const processedContent = replaceContractVariables(
    formData.content,
    variables,
  );

  const { data, error } = await supabase
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

  if (error)
    return {
      error:
        "Impossible de créer le contrat. Vérifiez les informations saisies.",
      data: null,
    };
  revalidatePath("/contracts");
  return { error: null, data };
}

export async function sendContract(contractId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const { error } = await supabase
    .from("contracts")
    .update({ status: "sent" })
    .eq("id", contractId);

  if (error) return { error: "Impossible d'envoyer le contrat." };

  // Get contract details for notification
  const { data: contract } = await supabase
    .from("contracts")
    .select("*, client:profiles(*)")
    .eq("id", contractId)
    .single();

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

  const { error } = await supabase
    .from("contracts")
    .update({
      status: "signed",
      signed_at: new Date().toISOString(),
      signature_data: signatureData,
      signer_name: signerName,
      signer_user_id: user.id,
    })
    .eq("id", contractId);

  if (error) return { error: "Impossible de sauvegarder la signature." };

  // Notify admins/managers
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

  // Auto-update deal to "Fermé (gagné)" stage
  await moveDealToSigned(supabase, contractId);

  // Auto-generate invoice on signature
  const { data: signedContract } = await supabase
    .from("contracts")
    .select("amount, installment_count")
    .eq("id", contractId)
    .single();

  if (signedContract?.amount) {
    try {
      await generateInvoice(contractId, signedContract.amount);
      // Auto-create installment plan if multi-payment
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

    // Notifier les admins/managers
    const { data: admins } = await supabase
      .from("profiles")
      .select("id")
      .in("role", ["admin", "manager"]);

    if (admins && admins.length > 0) {
      notifyMany(
        admins.map((a) => a.id),
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
