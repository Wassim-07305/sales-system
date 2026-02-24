import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getRevisionCards } from "@/lib/actions/academy";
import { RevisionView } from "./revision-view";

export default async function RevisionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Get all courses for filter
  const { data: courses } = await supabase
    .from("courses")
    .select("id, title")
    .order("title");

  const cards = await getRevisionCards();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <RevisionView cards={cards as any} courses={courses || []} />;
}
