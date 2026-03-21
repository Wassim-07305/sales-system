import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getProspects } from "@/lib/actions/prospecting";
import { getUnipileStatus } from "@/lib/actions/unipile";
import { InstagramView } from "../../instagram/instagram-view";

export default async function InstagramHubPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [prospects, unipileStatus] = await Promise.all([
    getProspects({ platform: "instagram" }),
    getUnipileStatus(),
  ]);

  const igAccount = unipileStatus.accounts.find(
    (a) => a.provider.toUpperCase() === "INSTAGRAM",
  );
  const unipileInstagram = unipileStatus.configured
    ? { connected: !!igAccount, accountName: igAccount?.name }
    : null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (
    <InstagramView
      prospects={prospects as any}
      unipileInstagram={unipileInstagram}
    />
  );
}
