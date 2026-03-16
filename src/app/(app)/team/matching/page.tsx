import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { MatchingMatrixView } from "./matching-matrix-view";

export default async function MatchingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return <MatchingMatrixView />;
}
