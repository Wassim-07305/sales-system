import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  getRoadmapItems,
  getCommunityS,
  getReleaseNotes,
} from "@/lib/actions/roadmap";
import { RoadmapView } from "./roadmap-view";

export default async function RoadmapPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [roadmapItems, suggestions, releaseNotes] = await Promise.all([
    getRoadmapItems(),
    getCommunityS(),
    getReleaseNotes(),
  ]);

  return (
    <RoadmapView
      roadmapItems={roadmapItems}
      suggestions={suggestions}
      releaseNotes={releaseNotes}
    />
  );
}
