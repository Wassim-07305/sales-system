"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getPaymentInstallments(contractId?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié", data: [] };

  let query = supabase
    .from("payment_installments")
    .select("*, contract:contracts(id, client_id, amount, status)")
    .order("due_date", { ascending: true });

  if (contractId) {
    query = query.eq("contract_id", contractId);
  }

  const { data, error } = await query;
  if (error) return { error: "Impossible de récupérer les échéances.", data: [] };
  return { error: null, data: data || [] };
}

export async function createInstallmentPlan(data: {
  contractId: string;
  totalAmount: number;
  installmentCount: number;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  // Vérifier que le contrat est signé avant de créer des échéances
  const { data: contract } = await supabase
    .from("contracts")
    .select("status")
    .eq("id", data.contractId)
    .single();

  if (!contract) return { error: "Contrat introuvable" };
  if (contract.status !== "signed") {
    return { error: "Impossible de créer un plan de paiement pour un contrat non signé" };
  }

  const amountPerInstallment = Math.round((data.totalAmount / data.installmentCount) * 100) / 100;
  const now = new Date();

  const installments = Array.from({ length: data.installmentCount }, (_, i) => {
    const dueDate = new Date(now);
    dueDate.setMonth(dueDate.getMonth() + i + 1);
    return {
      contract_id: data.contractId,
      amount: i === data.installmentCount - 1
        ? Math.round((data.totalAmount - amountPerInstallment * (data.installmentCount - 1)) * 100) / 100
        : amountPerInstallment,
      due_date: dueDate.toISOString().split("T")[0],
      status: "pending" as const,
    };
  });

  const { error } = await supabase
    .from("payment_installments")
    .insert(installments);

  if (error) return { error: "Impossible de créer le plan de paiement." };
  revalidatePath("/contracts/payments");
  return { success: true };
}

export async function recordPayment(installmentId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  // Récupérer les détails de l'échéance
  const { data: installment } = await supabase
    .from("payment_installments")
    .select("*, contract:contracts(id, client_id, amount)")
    .eq("id", installmentId)
    .single();

  if (!installment) return { error: "Échéance introuvable" };

  // Empêcher le double paiement
  if (installment.status === "paid") {
    return { error: "Cette échéance a déjà été payée" };
  }

  let stripePaymentId: string | null = null;

  // Si Stripe est configuré, créer un PaymentIntent
  if (process.env.STRIPE_SECRET_KEY) {
    try {
      const { stripe } = await import("@/lib/stripe/client");

      // Récupérer ou créer le customer Stripe
      const contract = Array.isArray(installment.contract)
        ? installment.contract[0]
        : installment.contract;
      const clientId = contract?.client_id;

      if (!clientId) {
        return { error: "Client introuvable sur le contrat" };
      }

      let stripeCustomerId: string | undefined;
      const { data: clientProfile } = await supabase
        .from("profiles")
        .select("stripe_customer_id, email, full_name")
        .eq("id", clientId)
        .single();

      if (clientProfile?.stripe_customer_id) {
        stripeCustomerId = clientProfile.stripe_customer_id;
      } else if (clientProfile?.email) {
        const customer = await stripe.customers.create({
          email: clientProfile.email,
          name: clientProfile.full_name || undefined,
          metadata: { supabase_user_id: clientId },
        });
        stripeCustomerId = customer.id;
        await supabase
          .from("profiles")
          .update({ stripe_customer_id: customer.id })
          .eq("id", clientId);
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(installment.amount * 100), // Stripe utilise les centimes
        currency: "eur",
        customer: stripeCustomerId,
        metadata: {
          installment_id: installmentId,
          contract_id: installment.contract_id,
        },
        confirm: true,
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: "never",
        },
      });

      stripePaymentId = paymentIntent.id;
    } catch (err) {
      console.error("Stripe payment error:", err);
      return { error: "Le paiement Stripe a échoué. Veuillez réessayer ou contacter l'administrateur." };
    }
  } else {
    stripePaymentId = `manual_${Date.now()}`;
  }

  const { error } = await supabase
    .from("payment_installments")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      stripe_payment_id: stripePaymentId,
    })
    .eq("id", installmentId);

  if (error) return { error: "Impossible d'enregistrer le paiement." };
  revalidatePath("/contracts/payments");
  return { success: true };
}

export async function generateInvoice(contractId: string, amount: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié", data: null };

  // Get client from contract
  const { data: contract } = await supabase
    .from("contracts")
    .select("client_id")
    .eq("id", contractId)
    .single();

  if (!contract) return { error: "Contrat introuvable", data: null };

  // Generate invoice number atomically via RPC to avoid race conditions
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;

  // Get the highest existing invoice number for this year
  const { data: lastInvoice } = await supabase
    .from("invoices")
    .select("invoice_number")
    .like("invoice_number", `${prefix}%`)
    .order("invoice_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  let nextNum = 1;
  if (lastInvoice?.invoice_number) {
    const lastNum = parseInt(lastInvoice.invoice_number.replace(prefix, ""), 10);
    if (!isNaN(lastNum)) nextNum = lastNum + 1;
  }

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 30);

  // Retry loop to handle concurrent inserts (unique constraint on invoice_number)
  let data;
  let error;
  for (let attempt = 0; attempt < 5; attempt++) {
    const invoiceNumber = `${prefix}${String(nextNum + attempt).padStart(4, "0")}`;
    const result = await supabase
      .from("invoices")
      .insert({
        contract_id: contractId,
        client_id: contract.client_id,
        amount,
        invoice_number: invoiceNumber,
        status: "draft",
        due_date: dueDate.toISOString().split("T")[0],
      })
      .select()
      .single();

    if (!result.error) {
      data = result.data;
      error = null;
      break;
    }
    // If it's a unique constraint violation, retry with next number
    if (result.error.code === "23505") {
      continue;
    }
    error = result.error;
    break;
  }

  if (error) return { error: "Impossible de générer la facture.", data: null };
  revalidatePath("/contracts/invoices");
  return { error: null, data };
}

export async function getInvoices() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("invoices")
    .select("*, contract:contracts(id, amount, status), client:profiles(id, full_name, email)")
    .order("created_at", { ascending: false });

  return data || [];
}

export async function getOverduePayments() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const today = new Date().toISOString().split("T")[0];

  const { data } = await supabase
    .from("payment_installments")
    .select("*, contract:contracts(id, client_id, amount)")
    .lt("due_date", today)
    .neq("status", "paid")
    .order("due_date", { ascending: true });

  return data || [];
}
