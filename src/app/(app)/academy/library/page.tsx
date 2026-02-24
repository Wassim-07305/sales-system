import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getResourceLibrary } from "@/lib/actions/academy";
import { LibraryView } from "./library-view";

export default async function LibraryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const resources = await getResourceLibrary();
  return <LibraryView resources={resources} />;
}
