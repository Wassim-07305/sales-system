"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function completeOnboardingStep(stepId: string, responseData?: Record<string, unknown>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  await supabase.from("client_onboarding").upsert({
    client_id: user.id,
    step_id: stepId,
    completed: true,
    completed_at: new Date().toISOString(),
    response_data: responseData || {},
  }, { onConflict: "client_id,step_id" });

  // Check if all required steps are completed
  const { data: allSteps } = await supabase
    .from("onboarding_steps")
    .select("id")
    .eq("is_required", true);

  const { data: completedSteps } = await supabase
    .from("client_onboarding")
    .select("step_id")
    .eq("client_id", user.id)
    .eq("completed", true);

  const completedIds = new Set((completedSteps || []).map((s) => s.step_id));
  const allCompleted = (allSteps || []).every((s) => completedIds.has(s.id));

  if (allCompleted) {
    await supabase
      .from("profiles")
      .update({ onboarding_completed: true })
      .eq("id", user.id);
  }

  // Update onboarding_step counter
  const completedCount = completedSteps?.length || 0;
  await supabase
    .from("profiles")
    .update({ onboarding_step: completedCount + (completedIds.has(stepId) ? 0 : 1) })
    .eq("id", user.id);

  revalidatePath("/onboarding");
}

export async function saveOnboardingStep(step: {
  id?: string;
  title: string;
  description: string;
  position: number;
  step_type: string;
  content: Record<string, unknown>;
  is_required: boolean;
}) {
  const supabase = await createClient();

  if (step.id) {
    await supabase
      .from("onboarding_steps")
      .update({
        title: step.title,
        description: step.description,
        position: step.position,
        step_type: step.step_type,
        content: step.content,
        is_required: step.is_required,
      })
      .eq("id", step.id);
  } else {
    await supabase.from("onboarding_steps").insert({
      title: step.title,
      description: step.description,
      position: step.position,
      step_type: step.step_type,
      content: step.content,
      is_required: step.is_required,
    });
  }

  revalidatePath("/onboarding");
  revalidatePath("/settings/onboarding");
}

export async function deleteOnboardingStep(stepId: string) {
  const supabase = await createClient();
  await supabase.from("onboarding_steps").delete().eq("id", stepId);
  revalidatePath("/settings/onboarding");
}
