import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { subDays, formatISO } from "date-fns";

const CRON_SECRET = process.env.CRON_SECRET;

/**
 * Cron quotidien — relance paiements en retard + expiration contrats inactifs.
 *
 * 1. Marque les paiements pending dont la due_date est passée comme "overdue"
 *    et notifie le client + le closer associé au contrat.
 * 2. Passe les contrats "draft" ou "sent" créés il y a plus de 30 jours en "expired"
 *    et notifie le closer / admin.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    return NextResponse.json(
      { error: "Service role key not configured" },
      { status: 500 },
    );
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
  );

  const today = new Date().toISOString().split("T")[0];

  // ── 1. Relance paiements overdue ──────────────────────────────────
  const { data: overduePayments } = await supabase
    .from("payment_installments")
    .select(
      "id, contract_id, amount, due_date, contract:contracts(id, client_id, deal_id)",
    )
    .eq("status", "pending")
    .lt("due_date", today);

  let paymentsMarked = 0;
  let paymentNotifications = 0;

  if (overduePayments && overduePayments.length > 0) {
    // Marquer tous comme overdue en une seule requête
    const overdueIds = overduePayments.map((p) => p.id);
    await supabase
      .from("payment_installments")
      .update({ status: "overdue" })
      .in("id", overdueIds);

    paymentsMarked = overdueIds.length;

    // Notifier pour chaque paiement overdue
    for (const payment of overduePayments) {
      const contract = Array.isArray(payment.contract)
        ? payment.contract[0]
        : payment.contract;

      if (!contract) continue;

      const amountFormatted = new Intl.NumberFormat("fr-FR", {
        style: "currency",
        currency: "EUR",
      }).format(payment.amount);

      // Notifier le client
      if (contract.client_id) {
        await supabase.from("notifications").insert({
          user_id: contract.client_id,
          title: "Paiement en retard",
          body: `Votre échéance de ${amountFormatted} (due le ${payment.due_date}) est en retard. Merci de régulariser au plus vite.`,
          type: "payment_overdue",
          link: "/contracts/payments",
          read: false,
        });
        paymentNotifications++;
      }

      // Notifier les closers / admins liés au deal
      if (contract.deal_id) {
        const { data: deal } = await supabase
          .from("deals")
          .select("closer_id")
          .eq("id", contract.deal_id)
          .single();

        if (deal?.closer_id) {
          await supabase.from("notifications").insert({
            user_id: deal.closer_id,
            title: "Paiement client en retard",
            body: `Un paiement de ${amountFormatted} est en retard sur le contrat #${contract.id.slice(0, 8)}.`,
            type: "payment_overdue",
            link: "/contracts/payments",
            read: false,
          });
          paymentNotifications++;
        }
      }

      // Notifier les admins
      const { data: admins } = await supabase
        .from("profiles")
        .select("id")
        .eq("role", "admin");

      if (admins) {
        const adminNotifs = admins.map((admin) => ({
          user_id: admin.id,
          title: "Paiement en retard",
          body: `Échéance de ${amountFormatted} en retard sur le contrat #${contract.id.slice(0, 8)}.`,
          type: "payment_overdue",
          link: "/contracts/payments",
          read: false,
        }));
        if (adminNotifs.length > 0) {
          await supabase.from("notifications").insert(adminNotifs);
          paymentNotifications += adminNotifs.length;
        }
      }
    }
  }

  // ── 2. Expiration contrats inactifs (30 jours) ────────────────────
  const thirtyDaysAgo = formatISO(subDays(new Date(), 30), {
    representation: "date",
  });

  const { data: staleContracts } = await supabase
    .from("contracts")
    .select("id, client_id, deal_id, status")
    .in("status", ["draft", "sent"])
    .lt("created_at", `${thirtyDaysAgo}T23:59:59`);

  let contractsExpired = 0;
  let expirationNotifications = 0;

  if (staleContracts && staleContracts.length > 0) {
    const staleIds = staleContracts.map((c) => c.id);
    await supabase
      .from("contracts")
      .update({ status: "expired" })
      .in("id", staleIds);

    contractsExpired = staleIds.length;

    // Notifier pour chaque contrat expiré
    for (const contract of staleContracts) {
      // Notifier le client
      if (contract.client_id) {
        await supabase.from("notifications").insert({
          user_id: contract.client_id,
          title: "Contrat expiré",
          body: `Votre contrat #${contract.id.slice(0, 8)} a expiré car il n'a pas été signé dans les 30 jours.`,
          type: "contract_expired",
          link: `/contracts/${contract.id}`,
          read: false,
        });
        expirationNotifications++;
      }

      // Notifier les admins
      const { data: admins } = await supabase
        .from("profiles")
        .select("id")
        .in("role", ["admin", "manager"]);

      if (admins) {
        const adminNotifs = admins.map((admin) => ({
          user_id: admin.id,
          title: "Contrat expiré automatiquement",
          body: `Le contrat #${contract.id.slice(0, 8)} (statut: ${contract.status}) a expiré après 30 jours sans signature.`,
          type: "contract_expired",
          link: `/contracts/${contract.id}`,
          read: false,
        }));
        if (adminNotifs.length > 0) {
          await supabase.from("notifications").insert(adminNotifs);
          expirationNotifications += adminNotifs.length;
        }
      }
    }
  }

  return NextResponse.json({
    message: "Payment reminders & contract expiration processed",
    payments: {
      markedOverdue: paymentsMarked,
      notificationsSent: paymentNotifications,
    },
    contracts: {
      expired: contractsExpired,
      notificationsSent: expirationNotifications,
    },
  });
}
