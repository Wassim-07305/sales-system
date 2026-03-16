"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { aiJSON } from "@/lib/ai/client";

export interface AIScriptData {
  accroche: string;
  flowchart: {
    etape: string;
    questions: string[];
    objections: { objection: string; reponse: string }[];
  }[];
  cta: string;
  generated_at: string;
}

export async function getAIScript(): Promise<AIScriptData | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("user_settings")
    .select("value")
    .eq("user_id", user.id)
    .eq("key", "generated_script")
    .single();

  if (!data?.value) return null;
  try {
    return JSON.parse(data.value) as AIScriptData;
  } catch {
    return null;
  }
}

export async function generateAIScript() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  // Get user settings
  const { data: settingsRows } = await supabase
    .from("user_settings")
    .select("key, value")
    .eq("user_id", user.id)
    .in("key", [
      "business_description",
      "offer",
      "linkedin_url",
      "instagram_username",
    ]);

  const settings: Record<string, string> = {};
  for (const row of settingsRows || []) settings[row.key] = row.value;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, company, niche, goals")
    .eq("id", user.id)
    .single();

  const businessDesc = settings.business_description || profile?.goals || "";
  const offer = settings.offer || profile?.niche || "";
  const company = profile?.company || "";

  let script: AIScriptData;

  try {
    const parsed = await aiJSON<Omit<AIScriptData, "generated_at">>(
      `Génère un script de prospection en français pour:
Entreprise: ${company || "Mon entreprise"}
Description: ${businessDesc || "Services de consulting"}
Offre: ${offer || "Formation et accompagnement"}

Réponds UNIQUEMENT en JSON valide avec cette structure exacte:
{
  "accroche": "Message d'accroche pour LinkedIn (2-3 phrases percutantes)",
  "flowchart": [
    {
      "etape": "Découverte",
      "questions": ["Question 1?", "Question 2?"],
      "objections": [{"objection": "Objection courante", "reponse": "Réponse efficace"}]
    },
    {
      "etape": "Qualification",
      "questions": ["Question 3?"],
      "objections": [{"objection": "Autre objection", "reponse": "Réponse"}]
    },
    {
      "etape": "Proposition",
      "questions": [],
      "objections": [{"objection": "Prix trop élevé", "reponse": "Focus sur ROI"}]
    }
  ],
  "cta": "Call-to-action final pour proposer un rendez-vous"
}`,
      { maxTokens: 1500 },
    );
    script = { ...parsed, generated_at: new Date().toISOString() };
  } catch {
    // Fallback template
    script = {
      accroche: `Bonjour [Prénom], je travaille avec des professionnels dans ${offer || "votre secteur"} pour les aider à ${businessDesc || "développer leur activité"}. Votre profil a retenu mon attention — j'aimerais comprendre vos challenges actuels.`,
      flowchart: [
        {
          etape: "Découverte",
          questions: [
            "Quels sont vos principaux défis en ce moment ?",
            "Comment gérez-vous actuellement [problème clé] ?",
            "Qu'avez-vous déjà essayé pour résoudre ça ?",
          ],
          objections: [
            {
              objection: "Je n'ai pas le temps",
              reponse:
                "Je comprends, c'est justement pour ça que notre approche est conçue pour prendre le minimum de votre temps. 15 minutes suffiront pour évaluer si on peut vous aider.",
            },
            {
              objection: "Envoyez-moi une documentation",
              reponse:
                "Je serais ravi de le faire ! Pour vous envoyer quelque chose de pertinent, pouvez-vous me dire rapidement quelle est votre priorité principale ?",
            },
          ],
        },
        {
          etape: "Qualification",
          questions: [
            "Quel est votre objectif principal sur les 6 prochains mois ?",
            "Avez-vous déjà un budget alloué pour ce type de solution ?",
            "Qui d'autre est impliqué dans cette décision ?",
          ],
          objections: [
            {
              objection: "Pas de budget",
              reponse:
                "Je comprends. Quelle valeur devrait apporter la solution pour que ça justifie un investissement ?",
            },
            {
              objection: "Ce n'est pas une priorité",
              reponse:
                "Qu'est-ce qui est prioritaire pour vous en ce moment ? Il est possible que notre solution adresse justement ces priorités.",
            },
          ],
        },
        {
          etape: "Proposition",
          questions: [],
          objections: [
            {
              objection: "C'est trop cher",
              reponse:
                "Si on pouvait vous montrer un ROI de 3x en 90 jours, est-ce que le prix serait toujours un obstacle ?",
            },
            {
              objection: "On a déjà un prestataire",
              reponse:
                "Excellent ! Notre approche est complémentaire. Beaucoup de nos clients travaillent avec d'autres prestataires. Qu'est-ce qui manque dans votre dispositif actuel ?",
            },
          ],
        },
      ],
      cta: `Super échange ! Je vous propose un appel de 20 minutes cette semaine pour vous présenter comment ${company || "nous"} peut concrètement vous aider. Mardi ou jeudi, ça vous convient ?`,
      generated_at: new Date().toISOString(),
    };
  }

  // Save to user_settings
  await supabase.from("user_settings").upsert(
    {
      user_id: user.id,
      key: "generated_script",
      value: JSON.stringify(script),
    },
    { onConflict: "user_id,key" },
  );

  revalidatePath("/ai-scripts");
  return { success: true, script };
}
