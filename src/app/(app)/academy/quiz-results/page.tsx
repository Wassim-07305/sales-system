import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { QuizResultsView } from "./quiz-results-view";

interface Props {
  searchParams: Promise<{ attemptId?: string }>;
}

export default async function QuizResultsPage({ searchParams }: Props) {
  const { attemptId } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (!attemptId) redirect("/academy");

  return <QuizResultsView attemptId={attemptId} />;
}
