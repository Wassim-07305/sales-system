import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = SupabaseClient<any, any, any>;

export const dynamic = "force-dynamic";

const CRON_SECRET = process.env.CRON_SECRET;
const MAX_MESSAGES_PER_RUN = 20; // Safety limit per cron run

interface AutoSendConfig {
  user_id: string;
  auto_send_enabled: boolean;
  auto_send_platforms: string[] | null;
  auto_send_template: string | null;
  auto_send_mode: string | null;
}

/**
 * Cron job pour l'envoi automatique IA de premiers messages.
 * Déclenché 2x/jour (matin + après-midi).
 *
 * Logique :
 * 1. Récupère les utilisateurs avec auto_send_enabled = true
 * 2. Pour chaque utilisateur, trouve les prospects "new" (jamais contactés)
 * 3. Génère un message personnalisé via IA (OpenRouter)
 * 4. Envoie via Unipile et crée une relance_workflow J+2/J+3
 * 5. Met à jour le statut du prospect à "contacted"
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
    users_processed: 0,
    messages_generated: 0,
    messages_sent: 0,
    relances_created: 0,
    validation_queued: 0,
    errors: 0,
    details: [] as string[],
  };

  try {
    // 1. Get users with auto_send_enabled
    const { data: configs, error: configError } = await supabase
      .from("ai_mode_configs")
      .select("user_id, auto_send_enabled, auto_send_platforms, auto_send_template, auto_send_mode")
      .eq("auto_send_enabled", true);

    if (configError) {
      return NextResponse.json(
        { error: `Erreur lecture configs: ${configError.message}` },
        { status: 500 },
      );
    }

    if (!configs || configs.length === 0) {
      return NextResponse.json({
        ok: true,
        message: "Aucun utilisateur avec auto-send actif",
        ...results,
        timestamp: new Date().toISOString(),
      });
    }

    // 2. Initialize Unipile
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
        results.details.push("Unipile non disponible");
      }
    }

    let totalSent = 0;

    // 3. Process each user
    for (const config of configs as AutoSendConfig[]) {
      if (totalSent >= MAX_MESSAGES_PER_RUN) break;
      results.users_processed++;

      try {
        const platforms = config.auto_send_platforms || [];
        if (platforms.length === 0) continue;

        const template =
          config.auto_send_template ||
          "Bonjour {nom}, j'ai vu votre activite et ca m'a interpelle ! J'aimerais echanger avec vous.";

        // Get new prospects (status = 'new') for this user
        const { data: prospects } = await supabase
          .from("prospects")
          .select("id, name, platform, profile_url, notes, status, metadata")
          .eq("created_by", config.user_id)
          .eq("status", "new")
          .in("platform", platforms)
          .order("created_at", { ascending: true })
          .limit(MAX_MESSAGES_PER_RUN - totalSent);

        if (!prospects || prospects.length === 0) continue;

        for (const prospect of prospects) {
          if (totalSent >= MAX_MESSAGES_PER_RUN) break;

          try {
            // Generate personalized message
            const metadata =
              typeof prospect.metadata === "object" && prospect.metadata
                ? (prospect.metadata as Record<string, unknown>)
                : {};
            const enrichment = metadata.enrichment as
              | Record<string, unknown>
              | undefined;

            const message = await generateMessage(
              {
                name: prospect.name,
                platform: prospect.platform,
                activity:
                  (enrichment?.headline as string) ||
                  (prospect.notes as string | null) ||
                  null,
                recent_post: (enrichment?.recent_post as string) || null,
                profile_url: prospect.profile_url,
                notes: prospect.notes as string | null,
              },
              template,
            );

            results.messages_generated++;

            // Check mode — if critical_validation or full_human, queue for review
            if (
              config.auto_send_mode === "critical_validation" ||
              config.auto_send_mode === "full_human"
            ) {
              // Store in inbox as draft for manual review
              await supabase.from("inbox_messages").insert({
                user_id: config.user_id,
                prospect_id: prospect.id,
                channel: prospect.platform,
                direction: "outbound",
                content: message,
                status: "draft",
                metadata: {
                  source: "ai_auto_send",
                  ai_mode: config.auto_send_mode,
                  needs_review: true,
                },
                created_at: new Date().toISOString(),
              });

              results.validation_queued++;
              continue;
            }

            // Auto-pilot mode — send directly via Unipile
            const sent = await sendMessage(
              supabase,
              unipileDsn,
              unipileApiKey,
              unipileAccounts,
              config.user_id,
              prospect,
              message,
            );

            if (sent) {
              results.messages_sent++;
              totalSent++;

              // Update prospect status
              await supabase
                .from("prospects")
                .update({
                  status: "contacted",
                  last_message_at: new Date().toISOString(),
                })
                .eq("id", prospect.id);

              // Create relance workflow J+2/J+3
              try {
                await supabase.from("relance_workflows").insert({
                  prospect_id: prospect.id,
                  platform: prospect.platform,
                  created_by: config.user_id,
                  status: "pending",
                  delay_j2_hours: 48,
                  delay_j3_hours: 72,
                  message_j2: `Bonjour ${prospect.name}, je reviens vers vous suite a mon message. Avez-vous eu le temps d'y jeter un oeil ?`,
                  message_j3: `${prospect.name}, dernier petit message ! Si le sujet vous interesse, je serais ravi d'en discuter. Sinon, pas de souci, bonne continuation !`,
                });
                results.relances_created++;
              } catch {
                // relance_workflows table may not exist
              }
            } else {
              results.errors++;
            }
          } catch (err) {
            results.errors++;
            results.details.push(
              `Erreur prospect ${prospect.name}: ${err instanceof Error ? err.message : "Erreur inconnue"}`,
            );
          }
        }
      } catch (err) {
        results.errors++;
        results.details.push(
          `Erreur user ${config.user_id}: ${err instanceof Error ? err.message : "Erreur inconnue"}`,
        );
      }
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
 * Generate a personalized message using AI via OpenRouter.
 * Falls back to basic template replacement if AI unavailable.
 */
async function generateMessage(
  prospect: {
    name: string;
    platform: string | null;
    activity: string | null;
    recent_post: string | null;
    profile_url: string | null;
    notes: string | null;
  },
  template: string,
): Promise<string> {
  // Basic variable replacement
  let message = template
    .replace(/\{nom\}/g, prospect.name || "")
    .replace(/\{activite\}/g, prospect.activity || "votre activite")
    .replace(
      /\{dernier_post\}/g,
      prospect.recent_post || "votre dernier contenu",
    );

  // Try AI personalization
  const openrouterKey = process.env.OPENROUTER_API_KEY;
  if (openrouterKey) {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openrouterKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "anthropic/claude-3.5-haiku",
          messages: [
            {
              role: "system",
              content:
                "Tu es un assistant de vente expert en prospection sociale. Ecris uniquement en francais. Sois naturel, pas commercial.",
            },
            {
              role: "user",
              content: `Personnalise ce message de prospection pour le rendre plus naturel et engageant.
Ne change pas le sens du message, juste rends-le plus humain et personnel.

Informations sur le prospect :
- Nom : ${prospect.name}
- Plateforme : ${prospect.platform || "inconnue"}
- Activite : ${prospect.activity || "non renseignee"}
- Dernier post : ${prospect.recent_post || "non disponible"}
- Notes : ${prospect.notes || "aucune"}

Message a personnaliser :
${message}

Reponds UNIQUEMENT avec le message personnalise, sans guillemets, sans explication.`,
            },
          ],
          max_tokens: 300,
          temperature: 0.7,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const aiMessage = data.choices?.[0]?.message?.content?.trim();
        if (aiMessage && aiMessage.length > 10) {
          message = aiMessage;
        }
      }
    } catch {
      // AI unavailable — use template
    }
  }

  return message;
}

/**
 * Send a message via Unipile or queue it locally.
 */
async function sendMessage(
  supabase: AnySupabaseClient,
  unipileDsn: string | undefined,
  unipileApiKey: string | undefined,
  accounts: Array<{ id: string; provider: string }>,
  userId: string,
  prospect: { id: string; name: string; platform: string; profile_url: string | null },
  message: string,
): Promise<boolean> {
  const providerName =
    prospect.platform === "linkedin" ? "LINKEDIN" : "INSTAGRAM";
  const account = accounts.find(
    (a) => a.provider.toUpperCase() === providerName,
  );

  // Try Unipile
  if (unipileDsn && unipileApiKey && account) {
    try {
      const res = await fetch(`${unipileDsn}/api/v1/chats`, {
        method: "POST",
        headers: {
          "X-API-KEY": unipileApiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          account_id: account.id,
          text: message,
          attendees_ids: [prospect.profile_url || prospect.id],
        }),
      });

      if (res.ok) {
        await logMessage(supabase, userId, prospect.id, prospect.platform, message, "sent");
        return true;
      }
    } catch {
      // Fallback
    }
  }

  // Fallback: queue locally
  await logMessage(supabase, userId, prospect.id, prospect.platform, message, "queued");
  return true;
}

/**
 * Log message in inbox_messages.
 */
async function logMessage(
  supabase: AnySupabaseClient,
  userId: string,
  prospectId: string,
  channel: string,
  content: string,
  status: string,
) {
  try {
    await supabase.from("inbox_messages").insert({
      user_id: userId,
      prospect_id: prospectId,
      channel,
      direction: "outbound",
      content,
      status,
      metadata: { source: "ai_auto_send", cron: true },
      created_at: new Date().toISOString(),
    });
  } catch {
    // Non-critical
  }
}
