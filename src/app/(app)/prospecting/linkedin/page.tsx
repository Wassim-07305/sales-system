import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getProspects } from "@/lib/actions/prospecting";
import { LinkedinView } from "./linkedin-view";

export default async function LinkedinPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const prospects = await getProspects({ platform: "linkedin" });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <LinkedinView prospects={prospects as any} />;
}
