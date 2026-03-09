import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { ImportView } from "./import-view";
import { getImportHistory } from "@/lib/actions/import";

export default async function ImportPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const history = await getImportHistory();

  return (
    <div>
      <PageHeader
        title="Import en masse"
        description="Importez vos contacts ou deals depuis un fichier CSV"
      />
      <ImportView importHistory={history} />
    </div>
  );
}
