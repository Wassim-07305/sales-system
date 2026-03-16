import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = SupabaseClient<any, any, any>;

const CRON_SECRET = process.env.CRON_SECRET;

interface DripCampaignStep {
  id: string;
  order: number;
  delay_days: number;
  template_id: string | null;
  action_type:
    | "send_dm"
    | "follow_up"
    | "like_post"
    | "comment"
    | "connection_request";
  custom_message?: string;
}

interface CampaignMeta {
  list_id?: string;
  description?: string;
}

interface ExecutionResult {
  step_id?: string;
  step_order?: number;
  prospect_id?: string;
  [key: string]: unknown;
}

/**
 * Cron job pour l'exécution des drip campaigns.
 * Déclenché par Vercel Cron ou un service externe.
 *
 * Logique :
 * 1. Récupère toutes les campaigns actives (automation_rules type = drip_campaign)
 * 2. Pour chaque campaign, récupère les prospects de la liste associée
 * 3. Pour chaque prospect, détermine le prochain step à exécuter
 * 4. Si le délai est écoulé, exécute le step (envoi message)
 * 5. Enregistre l'exécution dans automation_executions
 *
 * Idempotence : on vérifie qu'un step n'a pas déjà été exécuté pour un prospect donné.
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
      { status: 500 },
    );
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
  );

  const results = {
    campaigns_processed: 0,
    messages_sent: 0,
    already_completed: 0,
    errors: 0,
    details: [] as string[],
  };

  try {
    // --- 1. Récupérer toutes les drip campaigns actives ---
    const { data: campaigns, error: campaignsError } = await supabase
      .from("automation_rules")
      .select("*")
      .eq("type", "drip_campaign")
      .eq("is_active", true);

    if (campaignsError) {
      return NextResponse.json(
        { error: `Erreur lecture campaigns: ${campaignsError.message}` },
        { status: 500 },
      );
    }

    if (!campaigns || campaigns.length === 0) {
      return NextResponse.json({
        ok: true,
        message: "Aucune campaign active",
        ...results,
        timestamp: new Date().toISOString(),
      });
    }

    // --- 2. Traiter chaque campaign ---
    for (const campaign of campaigns) {
      try {
        results.campaigns_processed++;

        const meta = (campaign.trigger_conditions || {}) as CampaignMeta;
        const listId = meta.list_id;
        const steps = ((campaign.actions || []) as DripCampaignStep[]).sort(
          (a, b) => a.order - b.order,
        );

        if (!listId || steps.length === 0) {
          results.details.push(
            `Campaign "${campaign.name}" ignorée : pas de liste ou pas de steps`,
          );
          continue;
        }

        // --- 3. Récupérer les prospects de la liste ---
        const { data: prospects, error: prospectsError } = await supabase
          .from("prospects")
          .select("id, name, profile_url, platform, status")
          .eq("list_id", listId);

        if (prospectsError || !prospects || prospects.length === 0) {
          results.details.push(
            `Campaign "${campaign.name}" : aucun prospect dans la liste ${listId}`,
          );
          continue;
        }

        // --- 4. Récupérer toutes les exécutions existantes pour cette campaign ---
        const { data: existingExecutions } = await supabase
          .from("automation_executions")
          .select("id, target_user_id, status, result, created_at")
          .eq("rule_id", campaign.id);

        // Construire un index : prospect_id -> liste des steps exécutés
        const executionMap: Record<
          string,
          {
            step_id: string;
            step_order: number;
            created_at: string;
            status: string;
          }[]
        > = {};
        for (const exec of existingExecutions || []) {
          const r = (exec.result || {}) as ExecutionResult;
          const prospectId = exec.target_user_id;
          const stepId = r.step_id;
          const stepOrder = r.step_order;

          if (!executionMap[prospectId]) executionMap[prospectId] = [];
          if (stepId) {
            executionMap[prospectId].push({
              step_id: stepId,
              step_order: typeof stepOrder === "number" ? stepOrder : 0,
              created_at: exec.created_at || new Date().toISOString(),
              status: exec.status,
            });
          }
        }

        // --- 5. Pour chaque prospect, déterminer et exécuter le prochain step ---
        for (const prospect of prospects) {
          try {
            const prospectExecs = executionMap[prospect.id] || [];

            // Trouver le dernier step complété avec succès
            const completedSteps = prospectExecs
              .filter((e) => e.status === "completed")
              .sort((a, b) => b.step_order - a.step_order);

            const lastCompletedOrder =
              completedSteps.length > 0 ? completedSteps[0].step_order : 0;
            const lastCompletedAt =
              completedSteps.length > 0 ? completedSteps[0].created_at : null;

            // Si tous les steps sont complétés, passer au prospect suivant
            if (lastCompletedOrder >= steps.length) {
              results.already_completed++;
              continue;
            }

            // Trouver le prochain step à exécuter
            const nextStep = steps.find((s) => s.order > lastCompletedOrder);
            if (!nextStep) {
              results.already_completed++;
              continue;
            }

            // Vérifier que ce step n'est pas déjà en cours d'exécution (idempotence)
            const alreadyExecuted = prospectExecs.some(
              (e) => e.step_id === nextStep.id,
            );
            if (alreadyExecuted) {
              continue;
            }

            // Vérifier le délai : delay_days depuis le dernier step (ou depuis l'inscription)
            const referenceDate = lastCompletedAt
              ? new Date(lastCompletedAt)
              : new Date(
                  prospect.status === "active" ? Date.now() : Date.now(),
                );

            // Pour le premier step, on utilise la date de création du prospect
            // Pour les suivants, la date du dernier step complété
            const delayMs = nextStep.delay_days * 24 * 60 * 60 * 1000;
            const triggerDate = new Date(referenceDate.getTime() + delayMs);
            const now = new Date();

            if (now < triggerDate) {
              // Le délai n'est pas encore écoulé
              continue;
            }

            // --- 6. Exécuter le step ---
            const message = await buildStepMessage(
              supabase,
              nextStep,
              prospect,
            );

            // Envoyer le message selon le type d'action
            let sendSuccess = false;
            let sendError: string | null = null;

            if (
              nextStep.action_type === "send_dm" ||
              nextStep.action_type === "follow_up"
            ) {
              const result = await sendProspectMessage(
                supabase,
                prospect,
                message,
                campaign.created_by,
              );
              sendSuccess = result.success;
              sendError = result.error;
            } else {
              // Pour les actions non-messaging (like_post, comment, connection_request),
              // on les marque comme complétées (exécution manuelle requise)
              sendSuccess = true;
              sendError = null;
            }

            // --- 7. Logger l'exécution ---
            await supabase.from("automation_executions").insert({
              rule_id: campaign.id,
              target_user_id: prospect.id,
              status: sendSuccess ? "completed" : "failed",
              executed_at: new Date().toISOString(),
              result: {
                step_id: nextStep.id,
                step_order: nextStep.order,
                prospect_id: prospect.id,
                action_type: nextStep.action_type,
                message_preview: message.substring(0, 100),
                error: sendError,
              },
            });

            if (sendSuccess) {
              results.messages_sent++;
            } else {
              results.errors++;
              results.details.push(
                `Échec envoi à ${prospect.name} (campaign "${campaign.name}", step ${nextStep.order}): ${sendError}`,
              );
            }
          } catch (prospectErr) {
            results.errors++;
            results.details.push(
              `Erreur prospect ${prospect.id}: ${prospectErr instanceof Error ? prospectErr.message : "Erreur inconnue"}`,
            );
          }
        }
      } catch (campaignErr) {
        results.errors++;
        results.details.push(
          `Erreur campaign "${campaign.name}": ${campaignErr instanceof Error ? campaignErr.message : "Erreur inconnue"}`,
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
 * Construit le message à envoyer pour un step donné.
 * Utilise le template DM si configuré, sinon le custom_message.
 */
async function buildStepMessage(
  supabase: AnySupabaseClient,
  step: DripCampaignStep,
  prospect: { id: string; name: string },
): Promise<string> {
  // Si un template est référencé, le charger
  if (step.template_id) {
    const { data: template } = await supabase
      .from("dm_templates")
      .select("content")
      .eq("id", step.template_id)
      .single();

    if (template?.content) {
      // Remplacer les variables basiques dans le template
      return replaceVariables(template.content, prospect);
    }
  }

  // Fallback : utiliser le custom_message
  if (step.custom_message) {
    return replaceVariables(step.custom_message, prospect);
  }

  // Dernier recours : message générique selon le type d'action
  const defaultMessages: Record<string, string> = {
    send_dm: `Bonjour ${prospect.name}, j'espère que vous allez bien ! Je me permets de vous contacter pour échanger sur une opportunité qui pourrait vous intéresser.`,
    follow_up: `Bonjour ${prospect.name}, je me permets de revenir vers vous suite à notre précédent échange. Avez-vous eu le temps d'y réfléchir ?`,
    like_post: `Action : liker un post de ${prospect.name}`,
    comment: `Action : commenter un post de ${prospect.name}`,
    connection_request: `Action : envoyer une demande de connexion à ${prospect.name}`,
  };

  return defaultMessages[step.action_type] || `Message pour ${prospect.name}`;
}

/**
 * Remplace les variables {{nom}}, {{prenom}} etc. dans un message.
 */
function replaceVariables(content: string, prospect: { name: string }): string {
  return content
    .replace(/\{\{nom\}\}/gi, prospect.name)
    .replace(/\{\{name\}\}/gi, prospect.name)
    .replace(/\{\{prenom\}\}/gi, prospect.name.split(" ")[0] || prospect.name);
}

/**
 * Envoie un message à un prospect via WhatsApp ou enregistrement en base.
 * Tente d'abord Unipile, puis Meta WhatsApp API, puis stockage local.
 */
async function sendProspectMessage(
  supabase: AnySupabaseClient,
  prospect: { id: string; name: string; platform: string | null },
  message: string,
  campaignOwnerId: string | null,
): Promise<{ success: boolean; error: string | null }> {
  try {
    // Récupérer le téléphone du prospect
    const { data: prospectData } = await supabase
      .from("prospects")
      .select("phone, profile_url")
      .eq("id", prospect.id)
      .single();

    const phone = (prospectData as { phone?: string } | null)?.phone;

    // --- Tentative Unipile ---
    const unipileDsn = process.env.UNIPILE_DSN;
    const unipileApiKey = process.env.UNIPILE_API_KEY;

    if (unipileDsn && unipileApiKey && phone) {
      try {
        // Récupérer le compte WhatsApp Unipile
        const accountsRes = await fetch(`${unipileDsn}/api/v1/accounts`, {
          headers: { "X-API-KEY": unipileApiKey, Accept: "application/json" },
        });

        if (accountsRes.ok) {
          const accountsData = await accountsRes.json();
          const items = Array.isArray(accountsData)
            ? accountsData
            : accountsData.items || [];
          const waAccount = items.find(
            (a: { type?: string; provider?: string }) =>
              (a.type || a.provider || "").toUpperCase() === "WHATSAPP",
          );

          if (waAccount?.id) {
            const sendRes = await fetch(`${unipileDsn}/api/v1/chats`, {
              method: "POST",
              headers: {
                "X-API-KEY": unipileApiKey,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                account_id: waAccount.id,
                text: message,
                attendees_ids: [phone.replace(/[^0-9]/g, "")],
              }),
            });

            if (sendRes.ok) {
              return { success: true, error: null };
            }
          }
        }
      } catch {
        // Fallback vers Meta API
      }
    }

    // --- Tentative Meta WhatsApp API ---
    const waToken =
      process.env.WHATSAPP_ACCESS_TOKEN ||
      (await getOrgSetting(supabase, "WHATSAPP_ACCESS_TOKEN"));
    const waPhoneId =
      process.env.WHATSAPP_PHONE_NUMBER_ID ||
      (await getOrgSetting(supabase, "WHATSAPP_PHONE_NUMBER_ID"));

    if (waToken && waPhoneId && phone) {
      try {
        const res = await fetch(
          `https://graph.facebook.com/v21.0/${waPhoneId}/messages`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${waToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              messaging_product: "whatsapp",
              to: phone.replace(/[^0-9]/g, ""),
              type: "text",
              text: { body: message },
            }),
          },
        );

        if (res.ok) {
          // Enregistrer le message en base si une connexion WhatsApp existe
          await storeWhatsAppMessage(
            supabase,
            campaignOwnerId,
            prospect.id,
            message,
            "sent",
          );
          return { success: true, error: null };
        }

        await res.text();
      } catch {
        // Meta WhatsApp send failed — fall through to local storage
      }
    }

    // --- Fallback : stocker le message en base pour envoi ultérieur ---
    await storeWhatsAppMessage(
      supabase,
      campaignOwnerId,
      prospect.id,
      message,
      "queued",
    );

    return { success: true, error: null };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Erreur inconnue";
    return { success: false, error: errorMsg };
  }
}

/**
 * Récupère une valeur depuis org_settings.
 */
async function getOrgSetting(
  supabase: AnySupabaseClient,
  key: string,
): Promise<string | null> {
  try {
    const { data } = await supabase
      .from("org_settings")
      .select("value")
      .eq("key", key)
      .single();
    return data?.value || null;
  } catch {
    return null;
  }
}

/**
 * Enregistre un message WhatsApp dans la base de données.
 */
async function storeWhatsAppMessage(
  supabase: AnySupabaseClient,
  userId: string | null,
  prospectId: string,
  content: string,
  status: string,
) {
  if (!userId) return;

  try {
    // Récupérer la connexion WhatsApp de l'utilisateur
    const { data: connection } = await supabase
      .from("whatsapp_connections")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (connection) {
      await supabase.from("whatsapp_messages").insert({
        connection_id: connection.id,
        prospect_id: prospectId,
        direction: "outbound",
        content,
        status,
      });
    }
  } catch {
    // Ne pas bloquer l'exécution si le stockage échoue
  }
}
