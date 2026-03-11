import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAIScript } from "@/lib/actions/ai-scripts";
import { AIScriptsView } from "./ai-scripts-view";

export default async function AIScriptsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, company, niche")
    .eq("id", user.id)
    .single();

  const script = await getAIScript();

  return (
    <AIScriptsView
      script={script}
      role={profile?.role || "client_b2c"}
      userId={user.id}
    />
  );
}
