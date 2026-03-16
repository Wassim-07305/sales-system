import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getExercisePrompts } from "@/lib/actions/academy";
import { ExercisesView } from "./exercises-view";

export default async function ExercisesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const exercises = await getExercisePrompts();

  return <ExercisesView exercises={exercises} />;
}
