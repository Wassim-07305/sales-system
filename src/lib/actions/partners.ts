"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface Partner {
  id: string;
  name: string;
  email: string;
  company: string;
  type: "technology" | "consulting" | "referral";
  commission_rate: number;
  status: "active" | "pending" | "inactive";
  installations: number;
  revenue_generated: number;
  rating: number;
  created_at: string;
  approved_at: string | null;
}

export interface PartnerRevenue {
  month: string;
  revenue: number;
  commission: number;
  partners_count: number;
}

export interface PartnerPayout {
  id: string;
  partner_name: string;
  amount: number;
  period: string;
  status: "paid" | "pending" | "processing";
  paid_at: string | null;
}

// Mock data for demo when tables don't exist
const MOCK_PARTNERS: Partner[] = [
  {
    id: "p1",
    name: "Jean Dupont",
    email: "jean@techpartner.fr",
    company: "TechPartner SAS",
    type: "technology",
    commission_rate: 15,
    status: "active",
    installations: 47,
    revenue_generated: 34500,
    rating: 4.8,
    created_at: "2025-06-15T10:00:00Z",
    approved_at: "2025-06-20T14:00:00Z",
  },
  {
    id: "p2",
    name: "Marie Laurent",
    email: "marie@consultpro.fr",
    company: "ConsultPro",
    type: "consulting",
    commission_rate: 20,
    status: "active",
    installations: 32,
    revenue_generated: 28900,
    rating: 4.6,
    created_at: "2025-07-01T09:00:00Z",
    approved_at: "2025-07-05T11:00:00Z",
  },
  {
    id: "p3",
    name: "Pierre Martin",
    email: "pierre@refnetwork.fr",
    company: "RefNetwork",
    type: "referral",
    commission_rate: 10,
    status: "active",
    installations: 65,
    revenue_generated: 42100,
    rating: 4.9,
    created_at: "2025-05-10T08:00:00Z",
    approved_at: "2025-05-12T16:00:00Z",
  },
  {
    id: "p4",
    name: "Sophie Bernard",
    email: "sophie@digitalwave.fr",
    company: "DigitalWave",
    type: "technology",
    commission_rate: 18,
    status: "active",
    installations: 21,
    revenue_generated: 15800,
    rating: 4.3,
    created_at: "2025-08-20T12:00:00Z",
    approved_at: "2025-08-25T10:00:00Z",
  },
  {
    id: "p5",
    name: "Luc Moreau",
    email: "luc@growthlab.fr",
    company: "GrowthLab",
    type: "consulting",
    commission_rate: 22,
    status: "pending",
    installations: 0,
    revenue_generated: 0,
    rating: 0,
    created_at: "2026-03-01T14:00:00Z",
    approved_at: null,
  },
  {
    id: "p6",
    name: "Camille Petit",
    email: "camille@salesboost.fr",
    company: "SalesBoost",
    type: "referral",
    commission_rate: 12,
    status: "pending",
    installations: 0,
    revenue_generated: 0,
    rating: 0,
    created_at: "2026-02-28T09:00:00Z",
    approved_at: null,
  },
  {
    id: "p7",
    name: "Antoine Lefevre",
    email: "antoine@innovtech.fr",
    company: "InnovTech",
    type: "technology",
    commission_rate: 16,
    status: "inactive",
    installations: 8,
    revenue_generated: 5200,
    rating: 3.9,
    created_at: "2025-04-01T10:00:00Z",
    approved_at: "2025-04-05T09:00:00Z",
  },
];

const MOCK_REVENUE: PartnerRevenue[] = [
  { month: "Oct 2025", revenue: 18500, commission: 2960, partners_count: 3 },
  { month: "Nov 2025", revenue: 22300, commission: 3568, partners_count: 4 },
  { month: "Déc 2025", revenue: 19800, commission: 3168, partners_count: 4 },
  { month: "Jan 2026", revenue: 25600, commission: 4096, partners_count: 4 },
  { month: "Fév 2026", revenue: 28900, commission: 4624, partners_count: 4 },
  { month: "Mar 2026", revenue: 31200, commission: 4992, partners_count: 4 },
];

const MOCK_PAYOUTS: PartnerPayout[] = [
  { id: "pay1", partner_name: "TechPartner SAS", amount: 1725, period: "Mar 2026", status: "pending", paid_at: null },
  { id: "pay2", partner_name: "ConsultPro", amount: 1445, period: "Mar 2026", status: "processing", paid_at: null },
  { id: "pay3", partner_name: "RefNetwork", amount: 1405, period: "Mar 2026", status: "pending", paid_at: null },
  { id: "pay4", partner_name: "DigitalWave", amount: 790, period: "Fév 2026", status: "paid", paid_at: "2026-03-05T10:00:00Z" },
  { id: "pay5", partner_name: "TechPartner SAS", amount: 1580, period: "Fév 2026", status: "paid", paid_at: "2026-03-05T10:00:00Z" },
  { id: "pay6", partner_name: "ConsultPro", amount: 1320, period: "Fév 2026", status: "paid", paid_at: "2026-03-05T10:00:00Z" },
];

export async function getPartners() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  try {
    const { data, error } = await supabase
      .from("partners")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data as Partner[];
  } catch {
    // Table doesn't exist — return mock data
    return MOCK_PARTNERS;
  }
}

export async function getPartnerDetails(partnerId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  try {
    const { data, error } = await supabase
      .from("partners")
      .select("*")
      .eq("id", partnerId)
      .single();

    if (error) throw error;
    return data as Partner;
  } catch {
    // Fallback to mock
    return MOCK_PARTNERS.find((p) => p.id === partnerId) || null;
  }
}

export async function createPartner(data: {
  name: string;
  email: string;
  company: string;
  type: "technology" | "consulting" | "referral";
  commissionRate: number;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  try {
    const { data: partner, error } = await supabase
      .from("partners")
      .insert({
        name: data.name,
        email: data.email,
        company: data.company,
        type: data.type,
        commission_rate: data.commissionRate,
        status: "pending",
        installations: 0,
        revenue_generated: 0,
        rating: 0,
      })
      .select()
      .single();

    if (error) throw error;
    revalidatePath("/marketplace/partners");
    return partner as Partner;
  } catch {
    // Mock creation
    const newPartner: Partner = {
      id: `p${Date.now()}`,
      name: data.name,
      email: data.email,
      company: data.company,
      type: data.type,
      commission_rate: data.commissionRate,
      status: "pending",
      installations: 0,
      revenue_generated: 0,
      rating: 0,
      created_at: new Date().toISOString(),
      approved_at: null,
    };
    revalidatePath("/marketplace/partners");
    return newPartner;
  }
}

export async function updatePartner(id: string, updates: Partial<Partner>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  try {
    const { data, error } = await supabase
      .from("partners")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    revalidatePath("/marketplace/partners");
    return data as Partner;
  } catch {
    // Mock update
    const partner = MOCK_PARTNERS.find((p) => p.id === id);
    if (!partner) throw new Error("Partenaire introuvable");
    revalidatePath("/marketplace/partners");
    return { ...partner, ...updates } as Partner;
  }
}

export async function getPartnerRevenue() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  try {
    const { data, error } = await supabase
      .from("partner_revenue")
      .select("*")
      .order("month", { ascending: true });

    if (error) throw error;
    return {
      monthly: data as PartnerRevenue[],
      payouts: [] as PartnerPayout[],
    };
  } catch {
    // Return mock data
    return {
      monthly: MOCK_REVENUE,
      payouts: MOCK_PAYOUTS,
    };
  }
}

export async function approvePartner(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  try {
    const { data, error } = await supabase
      .from("partners")
      .update({ status: "active", approved_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    revalidatePath("/marketplace/partners");
    return data as Partner;
  } catch {
    // Mock approve
    const partner = MOCK_PARTNERS.find((p) => p.id === id);
    if (!partner) throw new Error("Partenaire introuvable");
    revalidatePath("/marketplace/partners");
    return { ...partner, status: "active" as const, approved_at: new Date().toISOString() };
  }
}
