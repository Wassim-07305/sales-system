import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  generateMonthlyB2BReport,
  generateMonthlyB2CReport,
} from "@/lib/actions/reports-auto";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();

  // Generate B2B reports
  const { data: entrepreneurs } = await supabase
    .from("profiles")
    .select("id, email")
    .eq("role", "client_b2b");

  type ReportEntry<T> = { email: string; report: T };

  const b2bReports: ReportEntry<
    NonNullable<Awaited<ReturnType<typeof generateMonthlyB2BReport>>>
  >[] = [];
  for (const e of entrepreneurs || []) {
    const report = await generateMonthlyB2BReport(e.id);
    if (report) b2bReports.push({ email: e.email, report });
  }

  // Generate B2C reports
  const { data: setters } = await supabase
    .from("profiles")
    .select("id, email")
    .eq("role", "client_b2c");

  const b2cReports: ReportEntry<
    NonNullable<Awaited<ReturnType<typeof generateMonthlyB2CReport>>>
  >[] = [];
  for (const s of setters || []) {
    const report = await generateMonthlyB2CReport(s.id);
    if (report) b2cReports.push({ email: s.email, report });
  }

  // Send via Resend if available
  try {
    const { Resend } = await import("resend");
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      const resend = new Resend(resendKey);
      const fromEmail =
        process.env.RESEND_FROM_EMAIL || "Sales System <noreply@resend.dev>";

      for (const { email, report } of b2bReports) {
        await resend.emails.send({
          from: fromEmail,
          to: email,
          subject: `Rapport mensuel — ${report.period}`,
          html: `<h1>Rapport ${report.period}</h1>
            <p>Bonjour ${report.entrepreneur},</p>
            <p>Voici le résumé d'activité de vos setters ce mois-ci :</p>
            <ul>
              <li>Messages envoyés : ${report.metrics.messagesEnvoyes}</li>
              <li>Taux de réponse : ${report.metrics.tauxReponse}%</li>
              <li>Appels bookés : ${report.metrics.appelsBookes}</li>
              <li>CA généré : ${report.metrics.caGenere.toLocaleString("fr-FR")} EUR</li>
            </ul>
            <p>Connectez-vous à votre portail pour plus de détails.</p>`,
        });
      }

      for (const { email, report } of b2cReports) {
        await resend.emails.send({
          from: fromEmail,
          to: email,
          subject: `Votre progression — ${report.period}`,
          html: `<h1>Votre mois en un coup d'oeil</h1>
            <p>Bonjour ${report.setter},</p>
            <ul>
              <li>Formation : ${report.formation.pourcentage}% complétée (${report.formation.modulesCompletes}/${report.formation.modulesTotal})</li>
              <li>Messages envoyés : ${report.activite.messagesEnvoyes}</li>
              <li>Appels bookés : ${report.activite.appelsBookes}</li>
              <li>Score maturité : ${report.activite.scoreMaturite}/100</li>
              <li>Points : ${report.gamification.points} — Niveau ${report.gamification.niveau}</li>
            </ul>`,
        });
      }
    }
  } catch {
    // Email sending failed — logged via Resend dashboard
  }

  return NextResponse.json({
    success: true,
    b2bReports: b2bReports.length,
    b2cReports: b2cReports.length,
  });
}
