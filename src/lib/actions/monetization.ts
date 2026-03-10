"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// ─── Types ───────────────────────────────────────────────────────

export interface MonetizationOverview {
  totalRevenue: number;
  commissionsThisMonth: number;
  activeSubscriptions: number;
  nextPayout: number;
  nextPayoutDate: string | null;
  revenueByMonth: Array<{ month: string; revenue: number }>;
  topExtensions: Array<{
    name: string;
    installs: number;
    revenue: number;
    growth: number;
  }>;
}

export interface ExtensionPricing {
  id: string;
  name: string;
  description: string;
  tiers: Array<{
    name: string;
    price: number;
    features: string[];
  }>;
}

export interface PayoutRecord {
  id: string;
  date: string;
  amount: number;
  status: "pending" | "processing" | "paid" | "failed";
  method: string;
}

export interface CommissionRate {
  type: string;
  rate: string;
  description: string;
  example: string;
}

// ─── Default extension pricing (configuration) ───────────────────
const DEFAULT_EXTENSIONS: ExtensionPricing[] = [
  {
    id: "crm-avance",
    name: "CRM Avance",
    description: "Pipeline avance avec automatisations et scoring IA",
    tiers: [
      { name: "Gratuit", price: 0, features: ["Pipeline basique", "5 contacts", "1 utilisateur"] },
      { name: "Pro", price: 29, features: ["Pipeline illimite", "Contacts illimites", "Scoring IA", "5 utilisateurs", "Automatisations"] },
      { name: "Enterprise", price: 79, features: ["Tout Pro", "Utilisateurs illimites", "API avancee", "Support prioritaire", "White-label"] },
    ],
  },
  {
    id: "auto-prospection",
    name: "Auto-Prospection IA",
    description: "Prospection automatisee avec intelligence artificielle",
    tiers: [
      { name: "Gratuit", price: 0, features: ["10 prospects/mois", "Templates basiques", "Email uniquement"] },
      { name: "Pro", price: 39, features: ["200 prospects/mois", "Templates IA", "Multi-canal", "Sequences auto", "Analytics"] },
      { name: "Enterprise", price: 99, features: ["Tout Pro", "Prospects illimites", "IA personnalisee", "Integrations CRM", "Accompagnement"] },
    ],
  },
  {
    id: "whatsapp-business",
    name: "WhatsApp Business+",
    description: "Integration WhatsApp complete avec chatbot IA",
    tiers: [
      { name: "Gratuit", price: 0, features: ["100 messages/mois", "1 numero", "Reponses manuelles"] },
      { name: "Pro", price: 25, features: ["5 000 messages/mois", "3 numeros", "Chatbot IA", "Templates", "Analytics"] },
      { name: "Enterprise", price: 69, features: ["Tout Pro", "Messages illimites", "Numeros illimites", "API webhooks", "SLA garanti"] },
    ],
  },
  {
    id: "analytics-pro",
    name: "Analytics Pro",
    description: "Tableaux de bord avances et predictions IA",
    tiers: [
      { name: "Gratuit", price: 0, features: ["Metriques basiques", "1 dashboard", "Export CSV"] },
      { name: "Pro", price: 19, features: ["Metriques avancees", "5 dashboards", "Predictions IA", "Export PDF", "Alertes"] },
      { name: "Enterprise", price: 49, features: ["Tout Pro", "Dashboards illimites", "IA predictive", "API donnees", "Data warehouse"] },
    ],
  },
  {
    id: "signature-electronique",
    name: "Signature Electronique",
    description: "Signature de contrats legalement valide",
    tiers: [
      { name: "Gratuit", price: 0, features: ["3 signatures/mois", "1 modele", "Signature simple"] },
      { name: "Pro", price: 15, features: ["50 signatures/mois", "Modeles illimites", "Signature avancee", "Rappels auto", "Audit trail"] },
      { name: "Enterprise", price: 39, features: ["Tout Pro", "Signatures illimitees", "eIDAS qualifie", "API complete", "Cachet serveur"] },
    ],
  },
  {
    id: "calendrier-sync",
    name: "Calendrier Sync",
    description: "Synchronisation multi-calendriers et reservation en ligne",
    tiers: [
      { name: "Gratuit", price: 0, features: ["1 calendrier", "Reservation basique", "Rappels email"] },
      { name: "Pro", price: 12, features: ["5 calendriers", "Page de reservation", "Rappels SMS", "Integration Zoom", "Buffer times"] },
      { name: "Enterprise", price: 35, features: ["Tout Pro", "Calendriers illimites", "Round-robin", "API calendrier", "Branding custom"] },
    ],
  },
];

// ─── GET MONETIZATION OVERVIEW ───────────────────────────────────
export async function getMonetizationOverview(): Promise<MonetizationOverview> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifie");

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString();

  // Get active subscriptions
  const { data: subscriptions, count: activeSubscriptions } = await supabase
    .from("extension_subscriptions")
    .select("id, price, extension_name, created_at", { count: "exact" })
    .eq("status", "active");

  // Calculate total revenue from subscriptions
  const totalRevenue = (subscriptions || []).reduce(
    (sum, s) => sum + (s.price || 0),
    0
  );

  // Get this month's commissions from partner referrals
  const { data: monthReferrals } = await supabase
    .from("partner_referrals")
    .select("commission_amount")
    .gte("converted_at", startOfMonth)
    .eq("status", "converted");

  const commissionsThisMonth = (monthReferrals || []).reduce(
    (sum, r) => sum + (r.commission_amount || 0),
    0
  );

  // Get pending payout
  const { data: pendingPayout } = await supabase
    .from("developer_payouts")
    .select("amount, created_at")
    .eq("developer_id", user.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Get extension installs grouped by extension
  const { data: installs } = await supabase
    .from("extension_installs")
    .select("extension_id, extension_name, installed_at")
    .gte("installed_at", sixMonthsAgo);

  // Calculate revenue by month
  const monthlyMap = new Map<string, number>();
  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = date.toLocaleDateString("fr-FR", { month: "short" });
    monthlyMap.set(monthKey, 0);
  }

  (subscriptions || []).forEach((sub) => {
    const date = new Date(sub.created_at);
    const monthKey = date.toLocaleDateString("fr-FR", { month: "short" });
    if (monthlyMap.has(monthKey)) {
      monthlyMap.set(monthKey, (monthlyMap.get(monthKey) || 0) + (sub.price || 0));
    }
  });

  const revenueByMonth = Array.from(monthlyMap.entries()).map(([month, revenue]) => ({
    month,
    revenue,
  }));

  // Calculate top extensions
  const extensionMap = new Map<string, { name: string; installs: number; revenue: number }>();

  (installs || []).forEach((install) => {
    const key = install.extension_id;
    if (!extensionMap.has(key)) {
      extensionMap.set(key, { name: install.extension_name, installs: 0, revenue: 0 });
    }
    const ext = extensionMap.get(key)!;
    ext.installs++;
  });

  (subscriptions || []).forEach((sub) => {
    const key = sub.extension_name;
    if (!extensionMap.has(key)) {
      extensionMap.set(key, { name: sub.extension_name, installs: 0, revenue: 0 });
    }
    const ext = extensionMap.get(key)!;
    ext.revenue += sub.price || 0;
  });

  const topExtensions = Array.from(extensionMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 6)
    .map((ext) => ({
      ...ext,
      growth: Math.random() * 20 - 5, // TODO: Calculate real growth
    }));

  return {
    totalRevenue,
    commissionsThisMonth,
    activeSubscriptions: activeSubscriptions || 0,
    nextPayout: pendingPayout?.amount || 0,
    nextPayoutDate: pendingPayout ? new Date(pendingPayout.created_at).toISOString().split("T")[0] : null,
    revenueByMonth,
    topExtensions,
  };
}

// ─── GET EXTENSION PRICING ───────────────────────────────────────
export async function getExtensionPricing(): Promise<ExtensionPricing[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifie");

  // Return default extensions (could be stored in DB for customization)
  return DEFAULT_EXTENSIONS;
}

// ─── GET PAYOUT HISTORY ──────────────────────────────────────────
export async function getPayoutHistory(): Promise<PayoutRecord[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifie");

  const { data, error } = await supabase
    .from("developer_payouts")
    .select("*")
    .eq("developer_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching payouts:", error);
    return [];
  }

  return (data || []).map((p) => ({
    id: p.id,
    date: p.created_at,
    amount: p.amount,
    status: p.status as PayoutRecord["status"],
    method: p.payment_method || "Virement bancaire",
  }));
}

// ─── GET COMMISSION RATES ────────────────────────────────────────
export async function getCommissionRates(): Promise<CommissionRate[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifie");

  const { data, error } = await supabase
    .from("commission_rates")
    .select("type, rate, rate_type, description, example")
    .eq("is_active", true)
    .order("type");

  if (error) {
    console.error("Error fetching commission rates:", error);
    // Return defaults if table doesn't exist
    return [
      { type: "Par installation", rate: "2,00 EUR", description: "Commission fixe par nouvelle installation", example: "100 installations = 200 EUR" },
      { type: "Abonnement mensuel", rate: "15%", description: "Pourcentage recurrent sur chaque abonnement actif", example: "Client a 29 EUR/mois = 4,35 EUR/mois" },
      { type: "Abonnement annuel", rate: "20%", description: "Bonus pour les engagements annuels", example: "Client a 290 EUR/an = 58 EUR/an" },
    ];
  }

  return (data || []).map((r) => ({
    type: r.type,
    rate: r.rate_type === "percentage" ? `${r.rate}%` : `${r.rate.toFixed(2)} EUR`,
    description: r.description || "",
    example: r.example || "",
  }));
}

// ─── REQUEST PAYOUT ──────────────────────────────────────────────
export async function requestPayout(amount: number): Promise<{ success: boolean; message: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifie");

  if (amount <= 0) throw new Error("Le montant doit etre positif");
  if (amount > 10000) throw new Error("Le montant maximum par versement est de 10 000 EUR");

  // Check for pending payouts
  const { data: pending } = await supabase
    .from("developer_payouts")
    .select("id")
    .eq("developer_id", user.id)
    .eq("status", "pending")
    .limit(1);

  if (pending && pending.length > 0) {
    throw new Error("Vous avez deja une demande de versement en attente");
  }

  // Create payout request
  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  const period = nextMonth.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  const { error } = await supabase
    .from("developer_payouts")
    .insert({
      developer_id: user.id,
      amount,
      period,
      status: "pending",
      payment_method: "Virement bancaire",
    });

  if (error) {
    console.error("Error creating payout:", error);
    throw new Error("Erreur lors de la demande de versement");
  }

  revalidatePath("/marketplace/monetization");

  return {
    success: true,
    message: `Demande de versement de ${amount.toLocaleString("fr-FR")} EUR enregistree. Traitement sous 3-5 jours ouvres.`,
  };
}

// ─── SUBSCRIBE TO EXTENSION ──────────────────────────────────────
export async function subscribeToExtension(
  extensionId: string,
  extensionName: string,
  tier: "free" | "pro" | "enterprise",
  price: number,
  billingPeriod: "monthly" | "yearly" = "monthly"
): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifie");

  // Check if already subscribed
  const { data: existing } = await supabase
    .from("extension_subscriptions")
    .select("id")
    .eq("user_id", user.id)
    .eq("extension_id", extensionId)
    .eq("status", "active")
    .single();

  if (existing) {
    throw new Error("Vous etes deja abonne a cette extension");
  }

  // Create subscription
  const expiresAt = new Date();
  if (billingPeriod === "monthly") {
    expiresAt.setMonth(expiresAt.getMonth() + 1);
  } else {
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);
  }

  const { error } = await supabase
    .from("extension_subscriptions")
    .insert({
      user_id: user.id,
      extension_id: extensionId,
      extension_name: extensionName,
      tier,
      price,
      billing_period: billingPeriod,
      status: tier === "free" ? "active" : "trial",
      expires_at: expiresAt.toISOString(),
    });

  if (error) {
    console.error("Error creating subscription:", error);
    throw new Error("Erreur lors de la souscription");
  }

  // Record install
  await supabase.from("extension_installs").insert({
    extension_id: extensionId,
    extension_name: extensionName,
    user_id: user.id,
  });

  revalidatePath("/marketplace");
}

// ─── CANCEL SUBSCRIPTION ─────────────────────────────────────────
export async function cancelSubscription(subscriptionId: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifie");

  const { error } = await supabase
    .from("extension_subscriptions")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
    })
    .eq("id", subscriptionId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error cancelling subscription:", error);
    throw new Error("Erreur lors de la resiliation");
  }

  revalidatePath("/marketplace");
}

// ─── GET MY SUBSCRIPTIONS ────────────────────────────────────────
export async function getMySubscriptions() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifie");

  const { data, error } = await supabase
    .from("extension_subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching subscriptions:", error);
    return [];
  }

  return data || [];
}
