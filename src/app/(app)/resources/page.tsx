import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ResourcesView } from "./resources-view";

export default async function ResourcesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch resources from database
  const { data: resources } = await supabase
    .from("resources")
    .select("*")
    .order("created_at", { ascending: false });

  // Fetch resource categories
  const { data: categories } = await supabase
    .from("resources")
    .select("category")
    .not("category", "is", null);

  // Get unique categories
  const uniqueCategories = [
    ...new Set(categories?.map((c) => c.category).filter(Boolean) || []),
  ];

  return (
    <ResourcesView
      resources={resources || []}
      categories={uniqueCategories as string[]}
    />
  );
}
