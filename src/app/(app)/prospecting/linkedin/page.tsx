import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getProspects } from "@/lib/actions/prospecting";
import { getUnipileStatus } from "@/lib/actions/unipile";
import { LinkedinView } from "./linkedin-view";

export default async function LinkedinPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [prospects, unipileStatus] = await Promise.all([
    getProspects({ platform: "linkedin" }),
    getUnipileStatus(),
  ]);

  const liAccount = unipileStatus.accounts.find(
    (a) => a.provider.toUpperCase() === "LINKEDIN",
  );
  const unipileLinkedin = unipileStatus.configured
    ? { connected: !!liAccount, accountName: liAccount?.name }
    : null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (
    <LinkedinView
      prospects={prospects as any}
      unipileLinkedin={unipileLinkedin}
    />
  );
}
