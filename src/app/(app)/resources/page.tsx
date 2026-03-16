import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getResources, getResourceCategories } from "@/lib/actions/resources";
import { ResourcesView } from "./resources-view";

export default async function ResourcesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [resources, categories] = await Promise.all([
    getResources(),
    getResourceCategories(),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <ResourcesView resources={resources as any} categories={categories} />;
}
