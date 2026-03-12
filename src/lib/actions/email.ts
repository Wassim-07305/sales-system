"use server";

import { resend, FROM_EMAIL, FROM_NAME } from "@/lib/resend/client";
import { createClient } from "@/lib/supabase/server";

/**
 * Send a transactional email via Resend.
 */
export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}) {
  const { data, error } = await resend.emails.send({
    from: `${FROM_NAME} <${FROM_EMAIL}>`,
    to: params.to,
    subject: params.subject,
    html: params.html,
    text: params.text,
  });

  if (error) throw new Error(error.message);
  return data;
}

/**
 * Send welcome email after registration.
 */
export async function sendWelcomeEmail(email: string, name: string) {
  return sendEmail({
    to: email,
    subject: "Bienvenue sur Sales System !",
    html: emailLayout(`
      <h1 style="color:#14080e;margin:0 0 16px">Bienvenue ${name} !</h1>
      <p>Ton compte a ete cree avec succes. Tu peux maintenant acceder a toutes les fonctionnalites de la plateforme.</p>
      <div style="text-align:center;margin:32px 0">
        <a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001"}/dashboard"
           style="background:#7af17a;color:#14080e;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">
          Acceder a mon espace
        </a>
      </div>
      <p style="color:#666">A bientot,<br>L'equipe Sales System</p>
    `),
  });
}

/**
 * Send booking confirmation email.
 */
export async function sendBookingConfirmation(params: {
  email: string;
  name: string;
  date: string;
  type: string;
}) {
  return sendEmail({
    to: params.email,
    subject: "Confirmation de votre rendez-vous",
    html: emailLayout(`
      <h1 style="color:#14080e;margin:0 0 16px">Rendez-vous confirme</h1>
      <p>Bonjour ${params.name},</p>
      <p>Votre rendez-vous a ete confirme :</p>
      <div style="background:#f5f5f5;border-radius:8px;padding:20px;margin:24px 0">
        <p style="margin:0 0 8px"><strong>Date :</strong> ${params.date}</p>
        <p style="margin:0"><strong>Type :</strong> ${params.type}</p>
      </div>
      <p>Nous vous contacterons au moment convenu. Assurez-vous d'etre disponible.</p>
    `),
  });
}

/**
 * Send payment confirmation email.
 */
export async function sendPaymentConfirmation(params: {
  email: string;
  name: string;
  amount: number;
  description: string;
}) {
  return sendEmail({
    to: params.email,
    subject: "Confirmation de paiement",
    html: emailLayout(`
      <h1 style="color:#14080e;margin:0 0 16px">Paiement recu</h1>
      <p>Bonjour ${params.name},</p>
      <p>Nous confirmons la reception de votre paiement :</p>
      <div style="background:#f5f5f5;border-radius:8px;padding:20px;margin:24px 0">
        <p style="margin:0 0 8px"><strong>Montant :</strong> ${params.amount.toLocaleString("fr-FR")} EUR</p>
        <p style="margin:0"><strong>Description :</strong> ${params.description}</p>
      </div>
      <p>Merci pour votre confiance !</p>
    `),
  });
}

/**
 * Send contract expiry reminder email.
 */
export async function sendContractExpiryReminder(params: {
  email: string;
  name: string;
  contractTitle: string;
  daysLeft: number;
}) {
  return sendEmail({
    to: params.email,
    subject: `Votre accompagnement se termine dans ${params.daysLeft} jours`,
    html: emailLayout(`
      <h1 style="color:#14080e;margin:0 0 16px">Renouvellement a venir</h1>
      <p>Bonjour ${params.name},</p>
      <p>Votre accompagnement <strong>"${params.contractTitle}"</strong> se termine dans <strong>${params.daysLeft} jours</strong>.</p>
      <p>Decouvrez nos offres pour continuer votre progression :</p>
      <div style="text-align:center;margin:32px 0">
        <a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001"}/settings/subscription"
           style="background:#7af17a;color:#14080e;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">
          Voir les offres
        </a>
      </div>
    `),
  });
}

/**
 * Send notification digest email (for users who have unread notifications).
 */
export async function sendNotificationDigest(userId: string) {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("email, full_name")
    .eq("id", userId)
    .single();

  if (!profile?.email) return;

  const { data: notifications } = await supabase
    .from("notifications")
    .select("title, body, created_at")
    .eq("user_id", userId)
    .eq("read", false)
    .order("created_at", { ascending: false })
    .limit(10);

  if (!notifications || notifications.length === 0) return;

  const notifHtml = notifications
    .map(
      (n) => `
      <div style="border-bottom:1px solid #eee;padding:12px 0">
        <p style="margin:0;font-weight:600">${n.title}</p>
        <p style="margin:4px 0 0;color:#666;font-size:14px">${n.body}</p>
      </div>
    `
    )
    .join("");

  return sendEmail({
    to: profile.email,
    subject: `${notifications.length} notification${notifications.length > 1 ? "s" : ""} en attente`,
    html: emailLayout(`
      <h1 style="color:#14080e;margin:0 0 16px">Tes notifications</h1>
      <p>Bonjour ${profile.full_name || ""},</p>
      <p>Tu as ${notifications.length} notification${notifications.length > 1 ? "s" : ""} non lue${notifications.length > 1 ? "s" : ""} :</p>
      <div style="margin:24px 0">${notifHtml}</div>
      <div style="text-align:center;margin:32px 0">
        <a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001"}/notifications"
           style="background:#7af17a;color:#14080e;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">
          Voir toutes mes notifications
        </a>
      </div>
    `),
  });
}

/**
 * Send deal stage change notification email.
 */
export async function sendDealStageEmail(params: {
  email: string;
  name: string;
  dealTitle: string;
  oldStage: string;
  newStage: string;
}) {
  return sendEmail({
    to: params.email,
    subject: `Deal "${params.dealTitle}" — ${params.newStage}`,
    html: emailLayout(`
      <h1 style="color:#14080e;margin:0 0 16px">Mise a jour de deal</h1>
      <p>Bonjour ${params.name},</p>
      <p>Le deal <strong>"${params.dealTitle}"</strong> a change de stage :</p>
      <div style="background:#f5f5f5;border-radius:8px;padding:20px;margin:24px 0;text-align:center">
        <span style="color:#666;text-decoration:line-through">${params.oldStage}</span>
        <span style="margin:0 12px;color:#14080e">→</span>
        <span style="color:#14080e;font-weight:700">${params.newStage}</span>
      </div>
      <div style="text-align:center;margin:32px 0">
        <a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001"}/crm"
           style="background:#7af17a;color:#14080e;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">
          Voir le pipeline
        </a>
      </div>
    `),
  });
}

/**
 * Send booking reminder email (24h before).
 */
export async function sendBookingReminder(params: {
  email: string;
  name: string;
  date: string;
  type: string;
  prospectName: string;
}) {
  return sendEmail({
    to: params.email,
    subject: `Rappel : rendez-vous demain avec ${params.prospectName}`,
    html: emailLayout(`
      <h1 style="color:#14080e;margin:0 0 16px">Rappel de rendez-vous</h1>
      <p>Bonjour ${params.name},</p>
      <p>Vous avez un rendez-vous demain :</p>
      <div style="background:#f5f5f5;border-radius:8px;padding:20px;margin:24px 0">
        <p style="margin:0 0 8px"><strong>Prospect :</strong> ${params.prospectName}</p>
        <p style="margin:0 0 8px"><strong>Date :</strong> ${params.date}</p>
        <p style="margin:0"><strong>Type :</strong> ${params.type}</p>
      </div>
      <p>Preparez vos notes et soyez pret !</p>
      <div style="text-align:center;margin:32px 0">
        <a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001"}/bookings"
           style="background:#7af17a;color:#14080e;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">
          Voir mes rendez-vous
        </a>
      </div>
    `),
  });
}

/**
 * Send challenge achievement email.
 */
export async function sendChallengeAchievedEmail(params: {
  email: string;
  name: string;
  challengeTitle: string;
  points: number;
}) {
  return sendEmail({
    to: params.email,
    subject: `Challenge reussi : ${params.challengeTitle}`,
    html: emailLayout(`
      <h1 style="color:#14080e;margin:0 0 16px">Felicitations !</h1>
      <p>Bonjour ${params.name},</p>
      <p>Tu as complete le challenge <strong>"${params.challengeTitle}"</strong> et gagne <strong>${params.points} points</strong> !</p>
      <div style="text-align:center;margin:32px 0">
        <div style="display:inline-block;background:#7af17a;color:#14080e;padding:16px 32px;border-radius:50%;font-size:32px;font-weight:700">
          +${params.points}
        </div>
      </div>
      <div style="text-align:center;margin:32px 0">
        <a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001"}/challenges"
           style="background:#7af17a;color:#14080e;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">
          Voir mes challenges
        </a>
      </div>
    `),
  });
}

/** Wraps HTML content in a branded email layout. */
function emailLayout(content: string): string {
  return `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px">
    <div style="text-align:center;margin-bottom:32px">
      <span style="font-size:24px;font-weight:700;color:#14080e">Sales System</span>
    </div>
    <div style="background:#ffffff;border-radius:12px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
      ${content}
    </div>
    <div style="text-align:center;margin-top:32px;color:#999;font-size:12px">
      <p>&copy; ${new Date().getFullYear()} Sales System. Tous droits reserves.</p>
    </div>
  </div>
</body>
</html>`;
}
