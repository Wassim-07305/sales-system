import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getUserCertificates } from "@/lib/actions/academy";
import { CertificatesView } from "./certificates-view";

export default async function CertificatesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { certificates, userName } = await getUserCertificates();

  return <CertificatesView certificates={certificates} userName={userName} />;
}
