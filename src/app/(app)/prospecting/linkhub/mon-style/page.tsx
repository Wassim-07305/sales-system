import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStyleSamples } from "@/lib/actions/linkedin-engage";
import { MonStyleView } from "./mon-style-view";

export default async function MonStylePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const samples = await getStyleSamples();

  return <MonStyleView initialSamples={samples} />;
}
