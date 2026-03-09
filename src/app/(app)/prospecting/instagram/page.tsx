import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getProspects } from "@/lib/actions/prospecting";
import { InstagramView } from "./instagram-view";

export default async function InstagramPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const prospects = await getProspects({ platform: "instagram" });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <InstagramView prospects={prospects as any} />;
}
