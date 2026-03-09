import { findDuplicateContacts } from "@/lib/actions/contacts";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { DuplicatesView } from "./duplicates-view";

export default async function DuplicatesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { groups, error } = await findDuplicateContacts();

  return (
    <div>
      <PageHeader
        title="Déduplication des contacts"
        description="Détectez et fusionnez les contacts en double"
      />
      <DuplicatesView initialGroups={groups || []} error={error} />
    </div>
  );
}
