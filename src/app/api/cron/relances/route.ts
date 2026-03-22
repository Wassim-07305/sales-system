import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = SupabaseClient<any, any, any>;

export const dynamic = "force-dynamic";

const CRON_SECRET = process.env.CRON_SECRET;

interface RelanceWorkflow {
  id: string;
  prospect_id: string;
  platform: string;
  created_by: string;
  status: string;
  delay_j2_hours: number;
  delay_j3_hours: number;
  message_j2: string;
  message_j3: string;
  j2_sent_at: string | null;
  j3_sent_at: string | null;
  created_at: string;
  prospect: {
    id: string;
    name: string;
    platform: string | null;
    profile_url: string | null;
    status: string | null;
    phone: string | null;
  } | null;
}

/**
 * Cron job pour le traitement des relances J+2/J+3.
 * Utilise le service role key (pas de session utilisateur).
 *
 * Logique :
 * 1. Récupère les relance_workflows en status "pending"
 * 2. Pour chaque relance, vérifie si le prospect a répondu → cancel
 * 3. Si le délai J+2 ou J+3 est écoulé, envoie le message via Unipile
 * 4. Met à jour le status et notifie le setter
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

  const results = {
    relances_checked: 0,
    j2_sent: 0,
    j3_sent: 0,
    responded_cancelled: 0,
    reminders_notified: 0,
    errors: 0,
    details: [] as string[],
  };

  try {
    // 1. Récupérer toutes les relances pending
    const { data: pendingRelances, error } = await supabase
      .from("relance_workflows")
      .select(
        "*, prospect:prospects(id, name, platform, profile_url, status, phone)",
      )
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: `Erreur lecture relances: ${error.message}` },
        { status: 500 },
      );
    }

    if (!pendingRelances || pendingRelances.length === 0) {
      return NextResponse.json({
        ok: true,
        message: "Aucune relance pending",
        ...results,
        timestamp: new Date().toISOString(),
      });
    }

    // 2. Initialiser Unipile
    const unipileDsn = process.env.UNIPILE_DSN;
    const unipileApiKey = process.env.UNIPILE_API_KEY;
    let unipileAccounts: Array<{
      id: string;
      provider: string;
    }> = [];

    if (unipileDsn && unipileApiKey) {
      try {
        const res = await fetch(`${unipileDsn}/api/v1/accounts`, {
          headers: {
            "X-API-KEY": unipileApiKey,
            Accept: "application/json",
          },
        });
        if (res.ok) {
          const data = await res.json();
          unipileAccounts = Array.isArray(data) ? data : data.items || [];
        }
      } catch {
        results.details.push("Unipile non disponible — relances en attente");
      }
    }

    const now = Date.now();

    // 3. Traiter chaque relance
    for (const relance of pendingRelances as RelanceWorkflow[]) {
      results.relances_checked++;
      const prospect = Array.isArray(relance.prospect)
        ? relance.prospect[0]
        : relance.prospect;

      try {
        // Vérifier si le prospect a répondu (inbound message récent)
        const hasReply = await checkProspectReplied(
          supabase,
          relance.prospect_id,
          relance.created_at,
        );

        if (
          hasReply ||
          prospect?.status === "replied" ||
          prospect?.status === "booked"
        ) {
          await supabase
            .from("relance_workflows")
            .update({
              status: "responded",
              responded_at: new Date().toISOString(),
            })
            .eq("id", relance.id);

          // Notifier le setter
          await notifySetter(
            supabase,
            relance.created_by,
            `${prospect?.name || "Un prospect"} a répondu ! Séquence de relance arrêtée.`,
            relance.prospect_id,
          );

          results.responded_cancelled++;
          continue;
        }

        const createdAt = new Date(relance.created_at).getTime();
        const j2Threshold =
          createdAt + (relance.delay_j2_hours || 48) * 60 * 60 * 1000;
        const j3Threshold =
          createdAt + (relance.delay_j3_hours || 72) * 60 * 60 * 1000;

        // J+3 (priorité si les deux seuils sont passés)
        if (!relance.j3_sent_at && now >= j3Threshold && relance.j2_sent_at) {
          const sent = await sendRelanceMessage(
            supabase,
            unipileDsn,
            unipileApiKey,
            unipileAccounts,
            relance,
            prospect,
            relance.message_j3,
            "j3",
          );

          if (sent) {
            await supabase
              .from("relance_workflows")
              .update({
                j3_sent_at: new Date().toISOString(),
                status: "sent", // Séquence terminée après J+3
              })
              .eq("id", relance.id);

            results.j3_sent++;
            results.details.push(
              `J+3 envoyé à ${prospect?.name || relance.prospect_id}`,
            );
          } else {
            results.errors++;
          }
        }
        // J+2
        else if (!relance.j2_sent_at && now >= j2Threshold) {
          const sent = await sendRelanceMessage(
            supabase,
            unipileDsn,
            unipileApiKey,
            unipileAccounts,
            relance,
            prospect,
            relance.message_j2,
            "j2",
          );

          if (sent) {
            await supabase
              .from("relance_workflows")
              .update({ j2_sent_at: new Date().toISOString() })
              .eq("id", relance.id);

            results.j2_sent++;
            results.details.push(
              `J+2 envoyé à ${prospect?.name || relance.prospect_id}`,
            );
          } else {
            results.errors++;
          }
        }
      } catch (err) {
        results.errors++;
        results.details.push(
          `Erreur relance ${relance.id}: ${err instanceof Error ? err.message : "Erreur inconnue"}`,
        );
      }
    }
    // 4. Process due reminders (follow_up_tasks)
    try {
      const now15min = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      const { data: dueReminders } = await supabase
        .from("follow_up_tasks")
        .select("id, prospect_id, message_content, scheduled_at, created_by, prospects(name)")
        .eq("completed", false)
        .lte("scheduled_at", now15min)
        .is("notified_at", null);

      for (const reminder of dueReminders || []) {
        const prospect = Array.isArray(reminder.prospects)
          ? reminder.prospects[0]
          : reminder.prospects;
        const prospectName = (prospect as { name: string } | null)?.name || "Prospect";
        const createdBy = reminder.created_by;

        if (createdBy) {
          await supabase.from("notifications").insert({
            user_id: createdBy,
            type: "prospect_reminder",
            title: `Rappel : ${prospectName}`,
            body: reminder.message_content || "Il est temps de relancer ce prospect",
            link: `/prospecting/${reminder.prospect_id}`,
          });

          await supabase
            .from("follow_up_tasks")
            .update({ notified_at: new Date().toISOString() })
            .eq("id", reminder.id);

          results.reminders_notified++;
        }
      }
    } catch {
      // follow_up_tasks table may not exist or notified_at column missing
      results.details.push("Rappels: table non disponible");
    }
  } catch (globalErr) {
    return NextResponse.json(
      {
        error: `Erreur globale: ${globalErr instanceof Error ? globalErr.message : "Erreur inconnue"}`,
      },
      { status: 500 },
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
 * Vérifie si le prospect a envoyé un message inbound depuis la création de la relance.
 */
async function checkProspectReplied(
  supabase: AnySupabaseClient,
  prospectId: string,
  relanceCreatedAt: string,
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("inbox_messages")
      .select("id")
      .eq("prospect_id", prospectId)
      .eq("direction", "inbound")
      .gt("created_at", relanceCreatedAt)
      .limit(1);

    if (error) return false;
    return (data?.length ?? 0) > 0;
  } catch {
    return false;
  }
}

/**
 * Envoie un message de relance via Unipile ou fallback en file d'attente.
 */
async function sendRelanceMessage(
  supabase: AnySupabaseClient,
  unipileDsn: string | undefined,
  unipileApiKey: string | undefined,
  accounts: Array<{ id: string; provider: string }>,
  relance: RelanceWorkflow,
  prospect: RelanceWorkflow["prospect"],
  message: string,
  step: "j2" | "j3",
): Promise<boolean> {
  const providerName =
    relance.platform === "linkedin" ? "LINKEDIN" : "INSTAGRAM";
  const account = accounts.find(
    (a) => a.provider.toUpperCase() === providerName,
  );

  // Tentative Unipile
  if (unipileDsn && unipileApiKey && account) {
    try {
      const recipientId =
        prospect?.profile_url || prospect?.phone || relance.prospect_id;

      const res = await fetch(`${unipileDsn}/api/v1/chats`, {
        method: "POST",
        headers: {
          "X-API-KEY": unipileApiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          account_id: account.id,
          text: message,
          attendees_ids: [recipientId],
        }),
      });

      if (res.ok) {
        // Logger dans inbox_messages
        await logRelanceMessage(
          supabase,
          relance,
          message,
          step,
          "sent",
        );
        return true;
      }
    } catch {
      // Fallback
    }
  }

  // Fallback: stocker en file d'attente
  await logRelanceMessage(supabase, relance, message, step, "queued");
  return true;
}

/**
 * Enregistre le message de relance dans inbox_messages avec metadata.
 */
async function logRelanceMessage(
  supabase: AnySupabaseClient,
  relance: RelanceWorkflow,
  content: string,
  step: "j2" | "j3",
  status: string,
) {
  try {
    await supabase.from("inbox_messages").insert({
      user_id: relance.created_by,
      prospect_id: relance.prospect_id,
      channel: relance.platform,
      direction: "outbound",
      content,
      status,
      metadata: {
        source: "auto_relance",
        step,
        relance_id: relance.id,
      },
      created_at: new Date().toISOString(),
    });
  } catch {
    // Non-critique
  }
}

/**
 * Envoie une notification au setter propriétaire de la relance.
 */
async function notifySetter(
  supabase: AnySupabaseClient,
  userId: string,
  message: string,
  prospectId: string,
) {
  try {
    await supabase.from("notifications").insert({
      user_id: userId,
      type: "relance",
      title: "Relance automatique",
      body: message,
      data: { prospect_id: prospectId, link: "/prospecting" },
      created_at: new Date().toISOString(),
    });
  } catch {
    // Non-critique
  }
}
