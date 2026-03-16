// ─── Apify REST API — module utilitaire ────────────────────────────────────
// Permet d'appeler n'importe quel acteur Apify via l'API REST.
// Le token est lu depuis process.env.APIFY_TOKEN.
// Timeout par défaut : 60 secondes (waitForFinish).

const APIFY_BASE = "https://api.apify.com/v2";

/**
 * Lance un acteur Apify, attend la fin de l'exécution et retourne les items
 * du dataset par défaut.
 *
 * @param actorId  Identifiant de l'acteur (ex: "george.the.developer/company-enrichment-api")
 * @param input    Objet d'input envoyé à l'acteur
 * @param timeoutSec  Durée max d'attente en secondes (défaut 60)
 * @returns Les items du dataset ou null en cas d'échec
 */
export async function callApifyActor<T = unknown>(
  actorId: string,
  input: Record<string, unknown>,
  timeoutSec = 60,
): Promise<T[] | null> {
  const token = process.env.APIFY_TOKEN;
  if (!token) {
    console.warn("[Apify] APIFY_TOKEN non configuré, skip");
    return null;
  }

  try {
    // Lancer l'acteur et attendre la fin
    const runRes = await fetch(
      `${APIFY_BASE}/acts/${actorId}/runs?token=${token}&waitForFinish=${timeoutSec}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      },
    );

    if (!runRes.ok) {
      console.error(
        `[Apify] Erreur lancement acteur ${actorId}: ${runRes.status} ${runRes.statusText}`,
      );
      return null;
    }

    const run = (await runRes.json()) as {
      data?: { defaultDatasetId?: string; status?: string };
    };

    const datasetId = run.data?.defaultDatasetId;
    if (!datasetId) {
      console.error("[Apify] Pas de datasetId dans la réponse");
      return null;
    }

    // Vérifier que l'acteur a bien terminé avec succès
    if (run.data?.status && run.data.status !== "SUCCEEDED") {
      console.error(`[Apify] Acteur terminé avec statut: ${run.data.status}`);
      return null;
    }

    // Récupérer les résultats du dataset
    const dataRes = await fetch(
      `${APIFY_BASE}/datasets/${datasetId}/items?token=${token}`,
    );

    if (!dataRes.ok) {
      console.error(`[Apify] Erreur récupération dataset: ${dataRes.status}`);
      return null;
    }

    const items = (await dataRes.json()) as T[];
    return items;
  } catch (err) {
    console.error(`[Apify] Exception lors de l'appel à ${actorId}:`, err);
    return null;
  }
}
