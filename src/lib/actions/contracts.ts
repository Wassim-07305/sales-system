"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createContract(formData: {
  templateId: string;
  clientId: string;
  dealId?: string;
  content: string;
  amount: number;
  paymentSchedule: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
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
      return { error: `Un contrat existe déjà pour ce deal (statut: ${existing.status}). Veuillez d'abord annuler le contrat existant.`, data: null };
    }
  }

  const { data, error } = await supabase
    .from("contracts")
    .insert({
      template_id: formData.templateId,
      client_id: formData.clientId,
      deal_id: formData.dealId || null,
      content: formData.content,
      amount: formData.amount,
      payment_schedule: formData.paymentSchedule,
      status: "draft",
    })
    .select()
    .single();

  if (error) return { error: "Impossible de créer le contrat. Vérifiez les informations saisies.", data: null };
  revalidatePath("/contracts");
  return { error: null, data };
}

export async function sendContract(contractId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
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
    await supabase.from("notifications").insert({
      user_id: contract.client_id,
      title: "Nouveau contrat à signer",
      body: "Un contrat vous a été envoyé. Cliquez pour le consulter et le signer.",
      type: "contract",
      link: `/contracts/${contractId}`,
    });
  }

  revalidatePath("/contracts");
  revalidatePath(`/contracts/${contractId}`);
  return { success: true };
}

export async function signContract(contractId: string, signatureData: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
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
    const notifications = admins.map((admin) => ({
      user_id: admin.id,
      title: "Contrat signé",
      body: "Un client vient de signer son contrat.",
      type: "contract",
      link: `/contracts/${contractId}`,
    }));
    await supabase.from("notifications").insert(notifications);
  }

  // Auto-update deal to "Client Signé" stage
  await moveDealToSigned(supabase, contractId);

  revalidatePath("/contracts");
  revalidatePath(`/contracts/${contractId}`);
  return { success: true };
}

async function moveDealToSigned(supabase: Awaited<ReturnType<typeof createClient>>, contractId: string) {
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
      .eq("name", "Client Signé")
      .single();

    if (!signedStage) return;

    await supabase
      .from("deals")
      .update({ stage_id: signedStage.id })
      .eq("id", contract.deal_id);

    revalidatePath("/crm");
  } catch (err) {
    console.error("moveDealToSigned failed:", err);
  }
}

export async function savePdfUrl(contractId: string, pdfUrl: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
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
  signerName: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const { data: contract } = await supabase
    .from("contracts")
    .select("id, status, client_id")
    .eq("id", contractId)
    .single();

  if (!contract) return { error: "Contrat introuvable" };
  if (contract.status === "signed") return { error: "Ce contrat est déjà signé" };

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
    const notifications = admins.map((admin) => ({
      user_id: admin.id,
      title: "Contrat signé",
      body: `Le contrat a été signé par ${signerName}.`,
      type: "contract",
      link: `/contracts/${contractId}`,
    }));
    await supabase.from("notifications").insert(notifications);
  }

  // Auto-update deal to "Client Signé" stage
  await moveDealToSigned(supabase, contractId);

  revalidatePath("/contracts");
  revalidatePath(`/contracts/${contractId}`);
  return { success: true };
}

export async function getSignatureStatus(contractId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const { data: contract, error } = await supabase
    .from("contracts")
    .select("id, status, signed_at, signature_data, signer_name, signer_user_id")
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
  const { data: { user } } = await supabase.auth.getUser();
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

  // Revert deal stage back to "Proposition" if linked
  if (contractData?.deal_id) {
    try {
      const { data: propositionStage } = await supabase
        .from("pipeline_stages")
        .select("id")
        .eq("name", "Proposition")
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
