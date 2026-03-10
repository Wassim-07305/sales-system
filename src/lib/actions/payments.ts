"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getPaymentInstallments(contractId?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  let query = supabase
    .from("payment_installments")
    .select("*, contract:contracts(id, client_id, amount, status)")
    .order("due_date", { ascending: true });

  if (contractId) {
    query = query.eq("contract_id", contractId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data || [];
}

export async function createInstallmentPlan(data: {
  contractId: string;
  totalAmount: number;
  installmentCount: number;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

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

  if (error) throw new Error(error.message);
  revalidatePath("/contracts/payments");
}

export async function recordPayment(installmentId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  // Récupérer les détails de l'échéance
  const { data: installment } = await supabase
    .from("payment_installments")
    .select("*, contract:contracts(id, client_id, amount)")
    .eq("id", installmentId)
    .single();

  if (!installment) throw new Error("Échéance introuvable");

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

      let stripeCustomerId: string | undefined;
      if (clientId) {
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
      // Continuer avec un enregistrement local si Stripe échoue
      stripePaymentId = `manual_${Date.now()}`;
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

  if (error) throw new Error(error.message);
  revalidatePath("/contracts/payments");
}

export async function generateInvoice(contractId: string, amount: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  // Get client from contract
  const { data: contract } = await supabase
    .from("contracts")
    .select("client_id")
    .eq("id", contractId)
    .single();

  if (!contract) throw new Error("Contrat introuvable");

  // Generate invoice number: INV-YYYY-NNNN
  const year = new Date().getFullYear();
  const { count } = await supabase
    .from("invoices")
    .select("id", { count: "exact", head: true });

  const invoiceNumber = `INV-${year}-${String((count || 0) + 1).padStart(4, "0")}`;

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 30);

  const { data, error } = await supabase
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

  if (error) throw new Error(error.message);
  revalidatePath("/contracts/invoices");
  return data;
}

export async function getInvoices() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const { data, error } = await supabase
    .from("invoices")
    .select("*, contract:contracts(id, amount, status), client:profiles(id, full_name, email)")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function getOverduePayments() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("payment_installments")
    .select("*, contract:contracts(id, client_id, amount)")
    .lt("due_date", today)
    .neq("status", "paid")
    .order("due_date", { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
}
