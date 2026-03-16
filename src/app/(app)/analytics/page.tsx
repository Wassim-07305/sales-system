import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getAnalyticsData, getTeamPerformance } from "@/lib/actions/analytics";
import {
  getStripeRevenueSummary,
  getStripeRecentPayments,
  getStripeSubscriptionStats,
  isStripeConfigured,
} from "@/lib/actions/stripe";
import { AnalyticsView } from "./analytics-view";

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "manager"].includes(profile.role)) {
    redirect("/dashboard");
  }

  const [
    analytics,
    teamPerformance,
    revenueSummary,
    recentPayments,
    subscriptionStats,
    stripeConfigured,
  ] = await Promise.all([
    getAnalyticsData(),
    getTeamPerformance(),
    getStripeRevenueSummary(),
    getStripeRecentPayments(5),
    getStripeSubscriptionStats(),
    isStripeConfigured(),
  ]);

  return (
    <AnalyticsView
      analytics={analytics}
      teamPerformance={teamPerformance}
      stripeRevenue={revenueSummary}
      stripePayments={recentPayments}
      stripeSubscriptions={subscriptionStats}
      stripeConfigured={stripeConfigured}
    />
  );
}
