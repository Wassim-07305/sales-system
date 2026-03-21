import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getRecommendations } from "@/lib/actions/linkedin-engage";
import { RecommandationsView } from "./recommandations-view";

export default async function RecommandationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const recommendations = await getRecommendations();

  return <RecommandationsView initialRecommendations={recommendations} />;
}
