"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface SimulatorInputs {
  dailyConversations: number;
  conversionRate: number;       // % of conversations → booked call
  showUpRate: number;            // % of booked calls that show up
  closingRate: number;           // % of show-ups that close
  averageDealValue: number;      // Average deal value in €
  workingDaysPerMonth: number;   // Typically 20-22
  commissionRate: number;        // Setter commission % (e.g., 10-20%)
}

export interface SimulatorResults {
  monthlyConversations: number;
  monthlyBookedCalls: number;
  monthlyShowUps: number;
  monthlyClosedDeals: number;
  monthlyGrossRevenue: number;
  monthlySetterCommission: number;
  yearlySetterCommission: number;
  // Funnel visualization
  funnel: Array<{
    label: string;
    value: number;
    percent: number;
  }>;
}

export async function calculateRevenue(inputs: SimulatorInputs): Promise<SimulatorResults> {
  const monthlyConversations = inputs.dailyConversations * inputs.workingDaysPerMonth;
  const monthlyBookedCalls = Math.round(monthlyConversations * (inputs.conversionRate / 100));
  const monthlyShowUps = Math.round(monthlyBookedCalls * (inputs.showUpRate / 100));
  const monthlyClosedDeals = Math.round(monthlyShowUps * (inputs.closingRate / 100));
  const monthlyGrossRevenue = monthlyClosedDeals * inputs.averageDealValue;
  const monthlySetterCommission = Math.round(monthlyGrossRevenue * (inputs.commissionRate / 100));
  const yearlySetterCommission = monthlySetterCommission * 12;

  const funnel = [
    { label: "Conversations/mois", value: monthlyConversations, percent: 100 },
    {
      label: "Appels bookes",
      value: monthlyBookedCalls,
      percent: monthlyConversations > 0 ? Math.round((monthlyBookedCalls / monthlyConversations) * 100) : 0,
    },
    {
      label: "Show-ups",
      value: monthlyShowUps,
      percent: monthlyConversations > 0 ? Math.round((monthlyShowUps / monthlyConversations) * 100) : 0,
    },
    {
      label: "Deals closes",
      value: monthlyClosedDeals,
      percent: monthlyConversations > 0 ? Math.round((monthlyClosedDeals / monthlyConversations) * 100) : 0,
    },
  ];

  return {
    monthlyConversations,
    monthlyBookedCalls,
    monthlyShowUps,
    monthlyClosedDeals,
    monthlyGrossRevenue,
    monthlySetterCommission,
    yearlySetterCommission,
    funnel,
  };
}

/**
 * Save simulator inputs for a user so they persist across sessions.
 */
export async function saveSimulatorInputs(inputs: SimulatorInputs) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifie");

  // Store in profiles.goals as JSON
  const { data: profile } = await supabase
    .from("profiles")
    .select("goals")
    .eq("id", user.id)
    .single();

  const existingGoals = profile?.goals ? JSON.parse(profile.goals) : {};
  const updatedGoals = { ...existingGoals, simulator: inputs };

  await supabase
    .from("profiles")
    .update({ goals: JSON.stringify(updatedGoals) })
    .eq("id", user.id);

  revalidatePath("/kpis");
}

/**
 * Load saved simulator inputs for a user.
 */
export async function getSimulatorInputs(): Promise<SimulatorInputs | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("goals")
    .eq("id", user.id)
    .single();

  if (!profile?.goals) return null;

  try {
    const goals = JSON.parse(profile.goals);
    return goals.simulator || null;
  } catch {
    return null;
  }
}
