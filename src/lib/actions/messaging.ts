"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type MessageChannel = "email" | "whatsapp" | "linkedin" | "instagram";

/**
 * Send a message to a contact via any supported channel.
 * Dispatches to the appropriate channel-specific function.
 */
export async function sendMessageToContact(params: {
  contactId: string;
  channel: MessageChannel;
  subject?: string;
  message: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const { contactId, channel, subject, message } = params;

  let result: { error?: string; success?: boolean };

  switch (channel) {
    case "email": {
      const { sendEmailToProspect } = await import("@/lib/actions/email");
      result = await sendEmailToProspect({
        contactId,
        subject: subject || "Message de votre conseiller",
        message,
      });
      break;
    }
    case "whatsapp": {
      try {
        const { sendWhatsAppMessage } = await import("@/lib/actions/whatsapp");
        await sendWhatsAppMessage({
          prospectId: contactId,
          content: message,
        });
        result = { success: true };
      } catch (err) {
        result = { error: err instanceof Error ? err.message : "Échec envoi WhatsApp" };
      }
      break;
    }
    case "linkedin": {
      const { sendLinkedInMessage } = await import("@/lib/actions/linkedin-api");
      const liResult = await sendLinkedInMessage(contactId, message);
      result = liResult.error
        ? { error: liResult.error }
        : { success: true };
      break;
    }
    case "instagram": {
      const { sendInstagramDM } = await import("@/lib/actions/instagram-api");
      const igResult = await sendInstagramDM(contactId, message);
      result = igResult.error
        ? { error: igResult.error }
        : { success: true };
      break;
    }
    default:
      result = { error: `Canal non supporté : ${channel}` };
  }

  // Log the activity on any associated deal
  if (result.success) {
    const { data: deal } = await supabase
      .from("deals")
      .select("id")
      .eq("contact_id", contactId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (deal) {
      await supabase.from("deal_activities").insert({
        deal_id: deal.id,
        user_id: user.id,
        type: channel === "email" ? "email" : "message",
        content: `Message envoyé via ${channel}${subject ? ` — ${subject}` : ""}`,
      });

      // Update last_contact_at
      await supabase
        .from("deals")
        .update({
          last_contact_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", deal.id);
    }

    revalidatePath(`/contacts/${contactId}`);
    revalidatePath("/crm");
  }

  return result;
}

/**
 * Generate an AI-powered follow-up message for a contact/deal.
 */
export async function generateFollowUpMessage(params: {
  contactName: string;
  dealTitle: string;
  daysOverdue: number;
  channel: MessageChannel;
  lastActivity?: string;
}) {
  try {
    const { aiComplete } = await import("@/lib/ai/client");

    const channelInstructions: Record<MessageChannel, string> = {
      email: "Format email professionnel avec objet et corps. Commence par 'Objet: ...' sur la première ligne, puis saute une ligne pour le corps.",
      whatsapp: "Message court et direct, adapté à WhatsApp. Pas de formalités excessives. 2-3 phrases max.",
      linkedin: "Message professionnel adapté à LinkedIn. Courtois mais concis. 3-4 phrases.",
      instagram: "Message court et amical adapté à Instagram DM. 1-2 phrases.",
    };

    const prompt = `Tu es un commercial expert en closing. Génère un message de relance personnalisé.

Contact : ${params.contactName}
Deal : ${params.dealTitle}
Jours sans contact : ${params.daysOverdue}
${params.lastActivity ? `Dernière activité : ${params.lastActivity}` : ""}

${channelInstructions[params.channel]}

Écris UNIQUEMENT le message, rien d'autre. En français.`;

    const message = await aiComplete(prompt, {
      system: "Tu es un assistant commercial. Tu écris des messages de relance naturels et efficaces en français. Sois direct, professionnel et empathique.",
      maxTokens: 300,
      temperature: 0.7,
    });

    return { message, error: null };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Erreur IA";
    return { message: null, error: errorMsg };
  }
}
