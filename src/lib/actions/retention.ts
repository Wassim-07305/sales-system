"use server";

import { createClient } from "@/lib/supabase/server";

export interface RetentionData {
  activeClients: number;
  inactiveClients: number;
  churnRate: number;
  atRiskClients: Array<{
    id: string;
    full_name: string | null;
    email: string | null;
    role: string;
    updated_at: string;
    daysSinceActive: number;
  }>;
  cohortRetention: Array<{
    month: string;
    total: number;
    active: number;
    rate: number;
  }>;
}

export async function getRetentionData(): Promise<RetentionData> {
  const supabase = await createClient();
  const now = new Date();
  const thirtyDaysAgo = new Date(
    now.getTime() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const fiveDaysAgo = new Date(
    now.getTime() - 5 * 24 * 60 * 60 * 1000,
  ).toISOString();

  // Active clients (logged in within 30 days)
  const { data: activeData } = await supabase
    .from("profiles")
    .select("id")
    .in("role", ["client_b2b", "client_b2c"])
    .gte("updated_at", thirtyDaysAgo);

  // Inactive clients (not logged in within 30 days)
  const { data: inactiveData } = await supabase
    .from("profiles")
    .select("id")
    .in("role", ["client_b2b", "client_b2c"])
    .lt("updated_at", thirtyDaysAgo);

  const activeCount = activeData?.length || 0;
  const inactiveCount = inactiveData?.length || 0;
  const totalClients = activeCount + inactiveCount;
  const churnRate =
    totalClients > 0 ? Math.round((inactiveCount / totalClients) * 100) : 0;

  // At-risk clients (no activity in 5+ days)
  const { data: atRiskData } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, updated_at")
    .in("role", ["client_b2b", "client_b2c"])
    .lt("updated_at", fiveDaysAgo)
    .order("updated_at", { ascending: true })
    .limit(50);

  const atRiskClients = (atRiskData || []).map((c) => ({
    id: c.id,
    full_name: c.full_name,
    email: c.email,
    role: c.role,
    updated_at: c.updated_at,
    daysSinceActive: Math.floor(
      (now.getTime() - new Date(c.updated_at).getTime()) /
        (1000 * 60 * 60 * 24),
    ),
  }));

  // Cohort retention - group by registration month
  const { data: allClients } = await supabase
    .from("profiles")
    .select("id, created_at, updated_at")
    .in("role", ["client_b2b", "client_b2c"])
    .order("created_at", { ascending: true });

  const cohortMap = new Map<string, { total: number; active: number }>();

  for (const client of allClients || []) {
    const createdDate = new Date(client.created_at);
    const monthKey = `${createdDate.getFullYear()}-${String(createdDate.getMonth() + 1).padStart(2, "0")}`;

    if (!cohortMap.has(monthKey)) {
      cohortMap.set(monthKey, { total: 0, active: 0 });
    }

    const cohort = cohortMap.get(monthKey)!;
    cohort.total++;

    const updatedAt = new Date(client.updated_at);
    if (updatedAt.getTime() >= new Date(thirtyDaysAgo).getTime()) {
      cohort.active++;
    }
  }

  const cohortRetention = Array.from(cohortMap.entries())
    .slice(-12)
    .map(([month, data]) => ({
      month,
      total: data.total,
      active: data.active,
      rate: data.total > 0 ? Math.round((data.active / data.total) * 100) : 0,
    }));

  return {
    activeClients: activeCount,
    inactiveClients: inactiveCount,
    churnRate,
    atRiskClients,
    cohortRetention,
  };
}
