import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getAdaptivePath } from "@/lib/actions/academy";
import { PathView } from "./path-view";

export default async function LearningPathPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const adaptivePath = await getAdaptivePath(user.id);

  return (
    <PathView
      skills={adaptivePath.skills}
      courses={adaptivePath.courses}
      overallScore={adaptivePath.overallScore}
      lastAssessedAt={adaptivePath.lastAssessedAt}
    />
  );
}
