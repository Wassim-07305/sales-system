"use server";

import { notify } from "@/lib/actions/notifications";

const ESCALATION_KEYWORDS: Record<string, string[]> = {
  objection: [
    "trop cher",
    "pas le budget",
    "pas intéressé",
    "pas le temps",
    "déjà un prestataire",
    "je réfléchis",
    "pas maintenant",
    "c'est combien",
    "quel prix",
    "tarif",
  ],
  call_request: [
    "appel",
    "téléphone",
    "on se call",
    "rdv",
    "rendez-vous",
    "disponible quand",
    "booking",
    "planifier",
  ],
  out_of_scope: [
    "remboursement",
    "annuler",
    "résilier",
    "problème technique",
    "bug",
    "erreur",
  ],
  high_engagement: [
    "très intéressé",
    "comment ça marche",
    "je veux en savoir plus",
    "c'est exactement ce qu'il me faut",
  ],
};

export type EscalationType =
  | "objection"
  | "call_request"
  | "out_of_scope"
  | "high_engagement"
  | null;

export async function detectEscalation(messageContent: string): Promise<{
  shouldEscalate: boolean;
  type: EscalationType;
  reason: string;
  suggestedAction: string;
}> {
  const content = messageContent.toLowerCase();

  for (const [type, keywords] of Object.entries(ESCALATION_KEYWORDS)) {
    for (const kw of keywords) {
      if (content.includes(kw)) {
        const actions: Record<string, string> = {
          objection: "Valider la réponse avant envoi — objection détectée",
          call_request: "Le prospect veut un appel — proposer un créneau",
          out_of_scope: "Demande hors-scope — intervention humaine requise",
          high_engagement: "Prospect très engagé — moment idéal pour closer",
        };
        return {
          shouldEscalate: true,
          type: type as EscalationType,
          reason: `Mot-clé détecté: "${kw}"`,
          suggestedAction: actions[type] || "Vérifier manuellement",
        };
      }
    }
  }

  return { shouldEscalate: false, type: null, reason: "", suggestedAction: "" };
}

export async function notifySetterForEscalation(
  setterId: string,
  prospectName: string,
  escalationType: EscalationType,
  messagePreview: string,
) {
  const labels: Record<string, string> = {
    objection: "Objection détectée",
    call_request: "Demande d'appel",
    out_of_scope: "Hors-scope",
    high_engagement: "Prospect chaud",
  };

  await notify(
    setterId,
    `Mode Duo: ${labels[escalationType || "objection"]}`,
    `${prospectName}: "${messagePreview.substring(0, 80)}..."`,
    { link: "/prospecting/hub", type: "ai_escalation" },
  );
}
