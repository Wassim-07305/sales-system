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
 * Send booking reminder email to prospect 24h before appointment.
 */
export async function sendBookingReminder(params: {
  email: string;
  name: string;
  date: string;
  type: string;
  meetingLink?: string;
}) {
  const linkSection = params.meetingLink
    ? `
      <div style="text-align:center;margin:24px 0">
        <a href="${params.meetingLink}"
           style="background:#7af17a;color:#14080e;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">
          Rejoindre le rendez-vous
        </a>
      </div>`
    : "";

  return sendEmail({
    to: params.email,
    subject: `Rappel : Votre rendez-vous demain - ${params.type}`,
    html: emailLayout(`
      <h1 style="color:#14080e;margin:0 0 16px">Rappel de rendez-vous</h1>
      <p>Bonjour ${params.name},</p>
      <p>Nous vous rappelons que vous avez un rendez-vous <strong>demain</strong> :</p>
      <div style="background:#f5f5f5;border-radius:8px;padding:20px;margin:24px 0">
        <p style="margin:0 0 8px"><strong>Date :</strong> ${params.date}</p>
        <p style="margin:0"><strong>Type :</strong> ${params.type}</p>
      </div>
      ${linkSection}
      <p>Merci de vous assurer d'etre disponible a l'heure convenue.</p>
      <p style="color:#666;font-size:14px;margin-top:24px">
        Si vous ne pouvez pas honorer ce rendez-vous, merci de nous prevenir au plus vite.
      </p>
    `),
  });
}

/**
 * Send booking reminders to all prospects with appointments in the next 24h.
 * Can be called via cron job.
 */
export async function sendBookingReminders() {
  const supabase = await createClient();
  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const in25h = new Date(now.getTime() + 25 * 60 * 60 * 1000);

  // Get bookings scheduled between 24h and 25h from now (1h window)
  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, prospect_name, prospect_email, scheduled_at, slot_type, meeting_link, reminder_sent")
    .gte("scheduled_at", in24h.toISOString())
    .lt("scheduled_at", in25h.toISOString())
    .eq("status", "confirmed")
    .eq("reminder_sent", false);

  if (!bookings || bookings.length === 0) {
    return { sent: 0 };
  }

  let sentCount = 0;

  for (const booking of bookings) {
    if (!booking.prospect_email) continue;

    try {
      const scheduledDate = new Date(booking.scheduled_at);
      const formattedDate = scheduledDate.toLocaleDateString("fr-FR", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      await sendBookingReminder({
        email: booking.prospect_email,
        name: booking.prospect_name || "Cher prospect",
        date: formattedDate,
        type: booking.slot_type || "Appel decouverte",
        meetingLink: booking.meeting_link || undefined,
      });

      // Mark reminder as sent
      await supabase
        .from("bookings")
        .update({ reminder_sent: true })
        .eq("id", booking.id);

      sentCount++;
    } catch (error) {
      console.error(`Failed to send reminder for booking ${booking.id}:`, error);
    }
  }

  return { sent: sentCount };
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
