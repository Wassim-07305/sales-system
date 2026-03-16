import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getRetentionData } from "@/lib/actions/retention";
import { RetentionView } from "./retention-view";

export default async function RetentionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const data = await getRetentionData();
  return <RetentionView data={data} />;
}
