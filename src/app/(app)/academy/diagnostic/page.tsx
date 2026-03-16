import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  getDiagnosticQuiz,
  getSkillAssessment,
  getAdaptivePath,
} from "@/lib/actions/academy";
import { DiagnosticView } from "./diagnostic-view";

export default async function DiagnosticPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [quiz, assessment, adaptivePath] = await Promise.all([
    getDiagnosticQuiz(),
    getSkillAssessment(user.id),
    getAdaptivePath(user.id),
  ]);

  const hasCompletedDiagnostic =
    assessment.source !== "none" && assessment.skills.length > 0;

  return (
    <DiagnosticView
      questions={quiz.questions}
      hasCompleted={hasCompletedDiagnostic}
      existingSkills={assessment.skills}
      existingOverallScore={
        "overallScore" in assessment ? (assessment.overallScore as number) : 0
      }
      completedAt={
        "completedAt" in assessment ? (assessment.completedAt as string) : null
      }
      recommendedCourses={adaptivePath.courses}
    />
  );
}
