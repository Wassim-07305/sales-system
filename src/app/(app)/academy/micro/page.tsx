import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getMicroLessons, getDailyMicroLesson } from "@/lib/actions/academy";
import { MicroLearningView } from "./micro-learning-view";

export default async function MicroLearningPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ microLessons, progressMap }, dailyLesson] = await Promise.all([
    getMicroLessons(),
    getDailyMicroLesson(),
  ]);

  return (
    <MicroLearningView
      microLessons={microLessons}
      progressMap={progressMap}
      dailyLesson={dailyLesson}
    />
  );
}
