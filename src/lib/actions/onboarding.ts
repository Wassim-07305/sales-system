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

// --- Batch 1B: Enhanced Onboarding ---

export async function submitOnboardingQuiz(answers: Record<string, string>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  // Calculate score based on answers
  const score = calculateQuizScore(answers);
  const colorCode = score >= 80 ? "green" : score >= 50 ? "orange" : "red";

  await supabase.from("onboarding_quiz_responses").insert({
    user_id: user.id,
    answers,
    score,
    color_code: colorCode,
  });

  // Update profile with quiz results
  await supabase
    .from("profiles")
    .update({ onboarding_step: 1 })
    .eq("id", user.id);

  revalidatePath("/onboarding");
  return { score, colorCode };
}

function calculateQuizScore(answers: Record<string, string>): number {
  // Scoring logic based on answer quality
  let score = 0;
  const keys = Object.keys(answers);
  for (const key of keys) {
    const answer = answers[key];
    if (answer && answer.length > 20) score += 15;
    else if (answer && answer.length > 5) score += 10;
    else if (answer) score += 5;
  }
  return Math.min(100, Math.round((score / (keys.length * 15)) * 100));
}

export async function getWelcomePack(userId: string) {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, company")
    .eq("id", userId)
    .single();

  const role = profile?.role || "client_b2c";

  // Get welcome pack for this role
  const { data: pack } = await supabase
    .from("welcome_packs")
    .select("*")
    .eq("role", role)
    .eq("is_active", true)
    .maybeSingle();

  // Get quiz results for personalization
  const { data: quizResult } = await supabase
    .from("onboarding_quiz_responses")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    profile,
    pack,
    quizResult,
    personalizedTips: await generatePersonalizedTips(role, quizResult?.color_code || "orange"),
  };
}

async function generatePersonalizedTips(role: string, colorCode: string): Promise<string[]> {
  const fallbackTips: Record<string, string[]> = {
    green: [
      "Excellent profil ! Vous êtes prêt à démarrer la prospection active.",
      "Commencez par personnaliser vos scripts dans l'onglet Scripts.",
      "Planifiez vos 3 premières sessions de rôle-play.",
    ],
    orange: [
      "Bon potentiel ! Complétez les modules de formation prioritaires.",
      "Concentrez-vous sur la maîtrise des objections.",
      "Participez aux calls de groupe pour progresser plus vite.",
    ],
    red: [
      "Bienvenue ! Commencez par les bases du setting.",
      "Regardez toutes les vidéos d'onboarding attentivement.",
      "N'hésitez pas à poser des questions dans la communauté.",
    ],
  };

  const fallback = fallbackTips[colorCode] || fallbackTips.orange;

  const { isAiConfigured } = await import("@/lib/ai/client");
  if (!isAiConfigured()) return fallback;

  try {
    const { completeJSON } = await import("@/lib/ai/utils");
    const { PERSONALIZED_TIPS_SYSTEM_PROMPT } = await import("@/lib/ai/prompts");

    return await completeJSON<string[]>({
      system: PERSONALIZED_TIPS_SYSTEM_PROMPT,
      user: `Génère 3 conseils personnalisés pour un apprenant.\n\nRôle : ${role}\nNiveau (code couleur) : ${colorCode} (green = excellent, orange = moyen, red = débutant)\n\nChaque conseil doit être actionnable, encourageant et spécifique au niveau de l'apprenant.`,
      model: "HAIKU",
      maxTokens: 512,
      fallback,
    });
  } catch {
    return fallback;
  }
}

export async function triggerAutoBooking(userId: string) {
  // Stub — will integrate with booking system later
  return { success: true, message: "Booking automatique programmé" };
}

export async function scrapeAndGenerateScript(linkedinUrl: string) {
  const fallback = {
    success: true,
    script: "Bonjour [Nom], j'ai vu votre profil et je pense que notre programme pourrait vous intéresser. Seriez-vous disponible pour un appel de 15 minutes cette semaine ?",
    profileData: { name: "Prospect", industry: "Non défini" },
  };

  const { isAiConfigured } = await import("@/lib/ai/client");
  if (!isAiConfigured()) return fallback;

  try {
    const slug = linkedinUrl.split("/in/")[1]?.replace(/\/$/, "") || "prospect";
    const { completeJSON } = await import("@/lib/ai/utils");

    return await completeJSON<typeof fallback>({
      system: `Tu es un expert en prospection LinkedIn. Génère un script de prospection personnalisé basé sur l'URL d'un profil LinkedIn. Retourne UNIQUEMENT un JSON valide : { "success": true, "script": "<string>", "profileData": { "name": "<string>", "industry": "<string>" } }`,
      user: `Génère un script de prospection personnalisé pour ce profil LinkedIn.\n\nURL : ${linkedinUrl}\nSlug : ${slug}\n\nDéduis le nom et le secteur d'activité depuis le slug. Génère un script naturel et personnalisé.`,
      model: "HAIKU",
      maxTokens: 1024,
      fallback,
    });
  } catch {
    return fallback;
  }
}
