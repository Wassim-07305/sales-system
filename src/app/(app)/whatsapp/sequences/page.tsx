import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getWhatsAppSequences } from "@/lib/actions/whatsapp";
import { SequencesView } from "./sequences-view";

export default async function SequencesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const sequences = await getWhatsAppSequences();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <SequencesView sequences={sequences as any} />;
}
