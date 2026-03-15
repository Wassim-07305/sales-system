import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = SupabaseClient<any, any, any>;

const CRON_SECRET = process.env.CRON_SECRET;

interface WeeklyMetrics {
  dealsCreated: number;
  totalPipelineValue: number;
  totalDmsSent: number;
  totalReplies: number;
  replyRate: number;
  bookingsFromDms: number;
  totalBookings: number;
  showUpRate: number;
  completedBookings: number;
}

/**
 * Cron job hebdomadaire : rapport de performance pour les entrepreneurs B2B.
 * Déclenché chaque lundi à 9h par Vercel Cron.
 *
 * Logique :
 * 1. Récupère tous les utilisateurs avec le rôle `client_b2b`
 * 2. Pour chaque client B2B, récupère ses setters assignés (via `matched_entrepreneur_id`)
 * 3. Pour chaque setter, génère le rapport hebdomadaire
 * 4. Agrège les métriques de tous les setters et crée une notification pour le client B2B
 */
export async function GET(request: Request) {
  // --- Vérification du secret cron ---
  const authHeader = request.headers.get("authorization");
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    return NextResponse.json(
      { error: "Service role key not configured" },
      { status: 500 }
    );
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey
  );

  const results = {
    clients_processed: 0,
    reports_sent: 0,
    skipped_no_setters: 0,
    errors: 0,
    details: [] as string[],
  };

  try {
    // --- 1. Récupérer tous les clients B2B actifs ---
    const { data: b2bClients, error: clientsError } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("role", "client_b2b");

    if (clientsError) {
      return NextResponse.json(
        { error: `Erreur lecture clients B2B: ${clientsError.message}` },
        { status: 500 }
      );
    }

    if (!b2bClients || b2bClients.length === 0) {
      return NextResponse.json({
        ok: true,
        message: "Aucun client B2B trouvé",
        ...results,
        timestamp: new Date().toISOString(),
      });
    }

    // --- 2. Traiter chaque client B2B ---
    for (const client of b2bClients) {
      try {
        results.clients_processed++;

        // Récupérer les setters assignés à ce client B2B
        const { data: setters, error: settersError } = await supabase
          .from("profiles")
          .select("id, full_name")
          .eq("matched_entrepreneur_id", client.id)
          .in("role", ["setter", "closer"]);

        if (settersError) {
          results.errors++;
          results.details.push(
            `Erreur lecture setters pour ${client.full_name || client.id}: ${settersError.message}`
          );
          continue;
        }

        if (!setters || setters.length === 0) {
          results.skipped_no_setters++;
          continue;
        }

        // --- 3. Générer le rapport pour chaque setter ---
        const setterReports: Array<{
          setterName: string;
          metrics: WeeklyMetrics;
        }> = [];

        for (const setter of setters) {
          const metrics = await generateSetterReport(supabase, setter.id);
          setterReports.push({
            setterName: setter.full_name || "Setter",
            metrics,
          });
        }

        // --- 4. Agréger les métriques ---
        const aggregated: WeeklyMetrics = {
          dealsCreated: 0,
          totalPipelineValue: 0,
          totalDmsSent: 0,
          totalReplies: 0,
          replyRate: 0,
          bookingsFromDms: 0,
          totalBookings: 0,
          showUpRate: 0,
          completedBookings: 0,
        };

        for (const report of setterReports) {
          aggregated.dealsCreated += report.metrics.dealsCreated;
          aggregated.totalPipelineValue += report.metrics.totalPipelineValue;
          aggregated.totalDmsSent += report.metrics.totalDmsSent;
          aggregated.totalReplies += report.metrics.totalReplies;
          aggregated.bookingsFromDms += report.metrics.bookingsFromDms;
          aggregated.totalBookings += report.metrics.totalBookings;
          aggregated.completedBookings += report.metrics.completedBookings;
        }

        // Calculer les taux agrégés
        aggregated.replyRate =
          aggregated.totalDmsSent > 0
            ? Math.round((aggregated.totalReplies / aggregated.totalDmsSent) * 100)
            : 0;
        aggregated.showUpRate =
          aggregated.totalBookings > 0
            ? Math.round((aggregated.completedBookings / aggregated.totalBookings) * 100)
            : 0;

        // --- 5. Construire le message de notification ---
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const fromDate = weekAgo.toLocaleDateString("fr-FR", {
          day: "numeric",
          month: "long",
        });
        const toDate = now.toLocaleDateString("fr-FR", {
          day: "numeric",
          month: "long",
        });

        const bodyLines = [
          `Rapport hebdomadaire du ${fromDate} au ${toDate}`,
          `Equipe : ${setters.length} setter(s) actif(s)`,
          "",
          `- ${aggregated.dealsCreated} deal(s) cree(s)`,
          `- ${aggregated.totalPipelineValue.toLocaleString("fr-FR")} EUR en pipeline`,
          `- ${aggregated.totalDmsSent} DM(s) envoye(s) (taux de reponse : ${aggregated.replyRate}%)`,
          `- ${aggregated.totalBookings} RDV dont ${aggregated.completedBookings} honore(s) (${aggregated.showUpRate}% show-up)`,
        ];

        // Détail par setter si plusieurs
        if (setterReports.length > 1) {
          bodyLines.push("", "Detail par setter :");
          for (const report of setterReports) {
            bodyLines.push(
              `  ${report.setterName} : ${report.metrics.dealsCreated} deals, ${report.metrics.totalDmsSent} DMs, ${report.metrics.totalBookings} RDV`
            );
          }
        }

        // --- 6. Vérifier qu'on n'a pas déjà envoyé cette semaine ---
        const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const { data: existingReport } = await supabase
          .from("notifications")
          .select("id")
          .eq("user_id", client.id)
          .eq("type", "weekly_report")
          .gte("created_at", weekStart)
          .limit(1);

        if (existingReport && existingReport.length > 0) {
          results.details.push(
            `Rapport déjà envoyé cette semaine pour ${client.full_name || client.id}`
          );
          continue;
        }

        // --- 7. Créer la notification (insertion directe via service role) ---
        const { error: notifError } = await supabase
          .from("notifications")
          .insert({
            user_id: client.id,
            title: "Rapport hebdomadaire de votre equipe",
            body: bodyLines.join("\n"),
            type: "weekly_report",
            link: "/analytics",
          });

        if (notifError) {
          results.errors++;
          results.details.push(
            `Erreur notification pour ${client.full_name || client.id}: ${notifError.message}`
          );
          continue;
        }

        // Envoyer aussi le push (fire-and-forget)
        await sendPushToUser(
          supabase,
          client.id,
          "Rapport hebdomadaire de votre equipe",
          bodyLines.slice(0, 3).join("\n"),
          "/analytics"
        );

        results.reports_sent++;
      } catch (clientErr) {
        results.errors++;
        results.details.push(
          `Erreur client ${client.full_name || client.id}: ${clientErr instanceof Error ? clientErr.message : "Erreur inconnue"}`
        );
      }
    }
  } catch (globalErr) {
    return NextResponse.json(
      {
        error: `Erreur globale: ${globalErr instanceof Error ? globalErr.message : "Erreur inconnue"}`,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    ...results,
    timestamp: new Date().toISOString(),
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Génère le rapport hebdomadaire pour un setter donné.
 * Réplique la logique de `generateWeeklyReport` en utilisant le client service role.
 */
async function generateSetterReport(
  supabase: AnySupabaseClient,
  setterId: string
): Promise<WeeklyMetrics> {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Deals cette semaine
  const { data: weekDeals } = await supabase
    .from("deals")
    .select("id, value, stage_id")
    .eq("assigned_to", setterId)
    .gte("created_at", weekAgo);

  // Bookings cette semaine
  const { data: weekBookings } = await supabase
    .from("bookings")
    .select("id, status")
    .eq("user_id", setterId)
    .gte("scheduled_at", weekAgo)
    .lte("scheduled_at", now.toISOString());

  // Quotas DM cette semaine
  const { data: weekQuotas } = await supabase
    .from("daily_quotas")
    .select("dms_sent, replies_received, bookings_from_dms")
    .eq("user_id", setterId)
    .gte("date", weekAgo.split("T")[0]);

  const totalDms = (weekQuotas || []).reduce((s: number, q: { dms_sent: number }) => s + q.dms_sent, 0);
  const totalReplies = (weekQuotas || []).reduce((s: number, q: { replies_received: number }) => s + q.replies_received, 0);
  const totalBookingsFromDms = (weekQuotas || []).reduce((s: number, q: { bookings_from_dms: number }) => s + q.bookings_from_dms, 0);
  const completedBookings = (weekBookings || []).filter((b: { status: string }) => b.status === "completed").length;
  const showUpRate =
    weekBookings && weekBookings.length > 0
      ? Math.round((completedBookings / weekBookings.length) * 100)
      : 0;

  return {
    dealsCreated: (weekDeals || []).length,
    totalPipelineValue: (weekDeals || []).reduce((s: number, d: { value: number | null }) => s + (d.value || 0), 0),
    totalDmsSent: totalDms,
    totalReplies,
    replyRate: totalDms > 0 ? Math.round((totalReplies / totalDms) * 100) : 0,
    bookingsFromDms: totalBookingsFromDms,
    totalBookings: (weekBookings || []).length,
    showUpRate,
    completedBookings,
  };
}

/**
 * Envoie un push notification via web-push si des subscriptions existent.
 * Fire-and-forget — ne bloque jamais.
 */
async function sendPushToUser(
  supabase: AnySupabaseClient,
  userId: string,
  title: string,
  body: string,
  _url?: string
) {
  try {
    const { data: subscriptions } = await supabase
      .from("push_subscriptions")
      .select("endpoint, keys, user_agent")
      .eq("user_id", userId);

    if (!subscriptions || subscriptions.length === 0) return;

    const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return;

    // Chargement dynamique de web-push pour éviter un import top-level
    // dans un contexte edge-compatible
    const webpush = await import("web-push").catch(() => null);
    if (!webpush) return;

    webpush.setVapidDetails(
      "mailto:contact@lecloser.app",
      VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY
    );

    const payload = JSON.stringify({ title, body });

    for (const sub of subscriptions) {
      try {
        const keys = typeof sub.keys === "string" ? JSON.parse(sub.keys) : sub.keys;
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys },
          payload
        );
      } catch {
        // Subscription expirée ou invalide — on continue
      }
    }
  } catch {
    // Ne jamais bloquer le cron
  }
}
