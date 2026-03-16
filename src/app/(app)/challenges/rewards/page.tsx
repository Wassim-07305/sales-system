import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  getRewardsCatalog,
  getRedemptionHistory,
} from "@/lib/actions/gamification";
import { RewardsView } from "./rewards-view";

export default async function RewardsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { rewards, currentPoints } = await getRewardsCatalog();
  const history = await getRedemptionHistory();

  return (
    <RewardsView
      rewards={rewards}
      currentPoints={currentPoints}
      history={history}
    />
  );
}
