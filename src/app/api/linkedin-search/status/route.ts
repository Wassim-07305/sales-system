import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// GET /api/linkedin-search/status?runId=xxx&datasetId=yyy
// Polls the Apify run status. Returns results when SUCCEEDED.
// Each call completes in <2s — safe for Vercel Hobby (10s limit).
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const runId = req.nextUrl.searchParams.get("runId");
  const datasetId = req.nextUrl.searchParams.get("datasetId");
  const apifyToken = process.env.APIFY_TOKEN;

  if (!runId || !apifyToken) {
    return NextResponse.json(
      { error: "Paramètres manquants" },
      { status: 400 },
    );
  }

  try {
    // Check run status
    const statusRes = await fetch(
      `https://api.apify.com/v2/actor-runs/${runId}?token=${apifyToken}`,
    );

    if (!statusRes.ok) {
      return NextResponse.json(
        { error: "Erreur Apify status" },
        { status: 500 },
      );
    }

    const statusData = (await statusRes.json()) as {
      data?: {
        status?: string;
        defaultDatasetId?: string;
      };
    };

    const status = statusData.data?.status;
    const resolvedDatasetId =
      datasetId || statusData.data?.defaultDatasetId;

    // Still running
    if (status === "RUNNING" || status === "READY") {
      return NextResponse.json({ pending: true, status });
    }

    // Failed
    if (status !== "SUCCEEDED") {
      return NextResponse.json({
        pending: false,
        data: [],
        error: `La recherche a échoué (statut: ${status})`,
      });
    }

    // SUCCEEDED — fetch dataset items
    if (!resolvedDatasetId) {
      return NextResponse.json({
        pending: false,
        data: [],
        error: "Pas de dataset disponible",
      });
    }

    const dataRes = await fetch(
      `https://api.apify.com/v2/datasets/${resolvedDatasetId}/items?token=${apifyToken}`,
    );

    if (!dataRes.ok) {
      return NextResponse.json({
        pending: false,
        data: [],
        error: "Erreur récupération résultats",
      });
    }

    const items = (await dataRes.json()) as Array<{
      firstName?: string;
      lastName?: string;
      fullName?: string;
      headline?: string;
      publicIdentifier?: string;
      jobTitle?: string;
      geoLocationName?: string;
      pictureUrl?: string;
      companyName?: string;
      [key: string]: unknown;
    }>;

    const results = items
      .filter((p) => p.firstName || p.lastName || p.fullName)
      .map((p, idx) => {
        const name =
          p.fullName ||
          [p.firstName, p.lastName].filter(Boolean).join(" ") ||
          "";
        const vanity = p.publicIdentifier || null;
        return {
          id: vanity || `apify-${idx}`,
          name,
          headline: p.headline || p.jobTitle || null,
          profile_url: vanity
            ? `https://linkedin.com/in/${vanity}`
            : null,
          source: "apify" as const,
        };
      });

    return NextResponse.json({ pending: false, data: results });
  } catch (err) {
    console.error("[LinkedIn Search Status] Error:", err);
    return NextResponse.json(
      { error: "Erreur lors de la vérification" },
      { status: 500 },
    );
  }
}
