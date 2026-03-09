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
  if (!user) throw new Error("Non authentifié");

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

  if (error) throw new Error(error.message);
  revalidatePath("/contracts");
  return data;
}

export async function sendContract(contractId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("contracts")
    .update({ status: "sent" })
    .eq("id", contractId);

  if (error) throw new Error(error.message);

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
}

export async function signContract(contractId: string, signatureData: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const { error } = await supabase
    .from("contracts")
    .update({
      status: "signed",
      signed_at: new Date().toISOString(),
      signature_data: signatureData,
    })
    .eq("id", contractId)
    .eq("client_id", user.id);

  if (error) throw new Error(error.message);

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

  revalidatePath("/contracts");
  revalidatePath(`/contracts/${contractId}`);
}

export async function savePdfUrl(contractId: string, pdfUrl: string) {
  const supabase = await createClient();
  await supabase
    .from("contracts")
    .update({ pdf_url: pdfUrl })
    .eq("id", contractId);
}

export async function saveSignature(
  contractId: string,
  signatureData: string,
  signerName: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const { data: contract } = await supabase
    .from("contracts")
    .select("id, status, client_id")
    .eq("id", contractId)
    .single();

  if (!contract) throw new Error("Contrat introuvable");
  if (contract.status === "signed") throw new Error("Contrat déjà signé");

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

  if (error) throw new Error(error.message);

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

  revalidatePath("/contracts");
  revalidatePath(`/contracts/${contractId}`);
  return { success: true };
}

export async function getSignatureStatus(contractId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const { data: contract, error } = await supabase
    .from("contracts")
    .select("id, status, signed_at, signature_data, signer_name, signer_user_id")
    .eq("id", contractId)
    .single();

  if (error || !contract) throw new Error("Contrat introuvable");

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
  if (!user) throw new Error("Non authentifié");

  // Check admin role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "manager"].includes(profile.role)) {
    throw new Error("Action réservée aux administrateurs");
  }

  const { error } = await supabase
    .from("contracts")
    .update({
      status: "sent",
      signed_at: null,
      signature_data: null,
      signer_name: null,
      signer_user_id: null,
    })
    .eq("id", contractId);

  if (error) throw new Error(error.message);

  revalidatePath("/contracts");
  revalidatePath(`/contracts/${contractId}`);
  return { success: true };
}
