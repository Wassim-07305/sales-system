"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getMonetizationOverview() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  return {
    totalRevenue: 47850,
    commissionsThisMonth: 3240,
    activeSubscriptions: 156,
    nextPayout: 2180,
    nextPayoutDate: "2026-03-15",
    revenueByMonth: [
      { month: "Oct", revenue: 5200 },
      { month: "Nov", revenue: 6800 },
      { month: "Déc", revenue: 7100 },
      { month: "Jan", revenue: 8400 },
      { month: "Fév", revenue: 9500 },
      { month: "Mar", revenue: 10850 },
    ],
    topExtensions: [
      { name: "CRM Avancé", installs: 342, revenue: 12800, growth: 12.5 },
      { name: "Auto-Prospection IA", installs: 289, revenue: 10200, growth: 18.3 },
      { name: "WhatsApp Business+", installs: 198, revenue: 8400, growth: 7.1 },
      { name: "Analytics Pro", installs: 176, revenue: 6200, growth: 15.8 },
      { name: "Signature Électronique", installs: 145, revenue: 5100, growth: -2.4 },
      { name: "Calendrier Sync", installs: 112, revenue: 3800, growth: 9.6 },
    ],
  };
}

export async function getExtensionPricing() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  return [
    {
      id: "crm-avance",
      name: "CRM Avancé",
      description: "Pipeline avancé avec automatisations et scoring IA",
      tiers: [
        { name: "Gratuit", price: 0, features: ["Pipeline basique", "5 contacts", "1 utilisateur"] },
        { name: "Pro", price: 29, features: ["Pipeline illimité", "Contacts illimités", "Scoring IA", "5 utilisateurs", "Automatisations"] },
        { name: "Enterprise", price: 79, features: ["Tout Pro", "Utilisateurs illimités", "API avancée", "Support prioritaire", "White-label"] },
      ],
    },
    {
      id: "auto-prospection",
      name: "Auto-Prospection IA",
      description: "Prospection automatisée avec intelligence artificielle",
      tiers: [
        { name: "Gratuit", price: 0, features: ["10 prospects/mois", "Templates basiques", "Email uniquement"] },
        { name: "Pro", price: 39, features: ["200 prospects/mois", "Templates IA", "Multi-canal", "Séquences auto", "Analytics"] },
        { name: "Enterprise", price: 99, features: ["Tout Pro", "Prospects illimités", "IA personnalisée", "Intégrations CRM", "Accompagnement"] },
      ],
    },
    {
      id: "whatsapp-business",
      name: "WhatsApp Business+",
      description: "Intégration WhatsApp complète avec chatbot IA",
      tiers: [
        { name: "Gratuit", price: 0, features: ["100 messages/mois", "1 numéro", "Réponses manuelles"] },
        { name: "Pro", price: 25, features: ["5 000 messages/mois", "3 numéros", "Chatbot IA", "Templates", "Analytics"] },
        { name: "Enterprise", price: 69, features: ["Tout Pro", "Messages illimités", "Numéros illimités", "API webhooks", "SLA garanti"] },
      ],
    },
    {
      id: "analytics-pro",
      name: "Analytics Pro",
      description: "Tableaux de bord avancés et prédictions IA",
      tiers: [
        { name: "Gratuit", price: 0, features: ["Métriques basiques", "1 dashboard", "Export CSV"] },
        { name: "Pro", price: 19, features: ["Métriques avancées", "5 dashboards", "Prédictions IA", "Export PDF", "Alertes"] },
        { name: "Enterprise", price: 49, features: ["Tout Pro", "Dashboards illimités", "IA prédictive", "API données", "Data warehouse"] },
      ],
    },
    {
      id: "signature-electronique",
      name: "Signature Électronique",
      description: "Signature de contrats légalement valide",
      tiers: [
        { name: "Gratuit", price: 0, features: ["3 signatures/mois", "1 modèle", "Signature simple"] },
        { name: "Pro", price: 15, features: ["50 signatures/mois", "Modèles illimités", "Signature avancée", "Rappels auto", "Audit trail"] },
        { name: "Enterprise", price: 39, features: ["Tout Pro", "Signatures illimitées", "eIDAS qualifié", "API complète", "Cachet serveur"] },
      ],
    },
    {
      id: "calendrier-sync",
      name: "Calendrier Sync",
      description: "Synchronisation multi-calendriers et réservation en ligne",
      tiers: [
        { name: "Gratuit", price: 0, features: ["1 calendrier", "Réservation basique", "Rappels email"] },
        { name: "Pro", price: 12, features: ["5 calendriers", "Page de réservation", "Rappels SMS", "Intégration Zoom", "Buffer times"] },
        { name: "Enterprise", price: 35, features: ["Tout Pro", "Calendriers illimités", "Round-robin", "API calendrier", "Branding custom"] },
      ],
    },
    {
      id: "formation-lms",
      name: "Formation LMS",
      description: "Plateforme de formation intégrée avec certifications",
      tiers: [
        { name: "Gratuit", price: 0, features: ["3 cours", "Quiz basiques", "Certificats simples"] },
        { name: "Pro", price: 22, features: ["Cours illimités", "Quiz avancés", "Certificats personnalisés", "Parcours guidés", "Analytics"] },
        { name: "Enterprise", price: 59, features: ["Tout Pro", "SCORM/xAPI", "Multi-tenant", "Marketplace interne", "API LMS"] },
      ],
    },
    {
      id: "facturation-auto",
      name: "Facturation Automatique",
      description: "Facturation, devis et suivi des paiements",
      tiers: [
        { name: "Gratuit", price: 0, features: ["5 factures/mois", "1 modèle", "Export PDF"] },
        { name: "Pro", price: 18, features: ["Factures illimitées", "Modèles personnalisés", "Paiement en ligne", "Relances auto", "Tableaux de bord"] },
        { name: "Enterprise", price: 45, features: ["Tout Pro", "Multi-devises", "API Stripe/GoCardless", "Comptabilité intégrée", "Conformité fiscale"] },
      ],
    },
  ];
}

export async function getPayoutHistory() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  return [
    { id: "p1", date: "2026-03-01", amount: 2180, status: "en_attente", method: "Virement bancaire" },
    { id: "p2", date: "2026-02-01", amount: 3100, status: "paye", method: "Virement bancaire" },
    { id: "p3", date: "2026-01-01", amount: 2750, status: "paye", method: "Virement bancaire" },
    { id: "p4", date: "2025-12-01", amount: 2400, status: "paye", method: "PayPal" },
    { id: "p5", date: "2025-11-01", amount: 1950, status: "paye", method: "Virement bancaire" },
    { id: "p6", date: "2025-10-01", amount: 1680, status: "paye", method: "PayPal" },
  ];
}

export async function getCommissionRates() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  return [
    { type: "Par installation", rate: "2,00 €", description: "Commission fixe par nouvelle installation", example: "100 installations = 200 €" },
    { type: "Abonnement mensuel", rate: "15%", description: "Pourcentage récurrent sur chaque abonnement actif", example: "Client à 29 €/mois = 4,35 €/mois" },
    { type: "Abonnement annuel", rate: "20%", description: "Bonus pour les engagements annuels", example: "Client à 290 €/an = 58 €/an" },
    { type: "Tier Gratuit → Pro", rate: "5,00 €", description: "Bonus de conversion freemium", example: "50 conversions = 250 €" },
    { type: "Tier Pro → Enterprise", rate: "10,00 €", description: "Bonus d'upsell Enterprise", example: "20 upsells = 200 €" },
    { type: "Parrainage développeur", rate: "50,00 €", description: "Prime pour chaque nouveau développeur parrainé", example: "5 parrainages = 250 €" },
  ];
}

export async function requestPayout(amount: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  if (amount <= 0) throw new Error("Le montant doit être positif");
  if (amount > 10000) throw new Error("Le montant maximum par versement est de 10 000 €");

  // Simulate payout request
  revalidatePath("/marketplace/monetization");

  return {
    success: true,
    message: `Demande de versement de ${amount.toLocaleString("fr-FR")} € enregistrée. Traitement sous 3-5 jours ouvrés.`,
  };
}
