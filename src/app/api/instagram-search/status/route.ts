import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// GET /api/instagram-search/status?runId=xxx&datasetId=yyy
// Polls the search actor status. Returns results when SUCCEEDED.
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
    const statusRes = await fetch(
      `https://api.apify.com/v2/actor-runs/${runId}?token=${apifyToken}`,
    );

    if (!statusRes.ok) {
      return NextResponse.json(
        { error: "Erreur lors de la vérification du statut" },
        { status: 500 },
      );
    }

    const statusData = (await statusRes.json()) as {
      data?: { status?: string; defaultDatasetId?: string };
    };

    const status = statusData.data?.status;
    const resolvedDatasetId = datasetId || statusData.data?.defaultDatasetId;

    if (status === "RUNNING" || status === "READY") {
      return NextResponse.json({ pending: true, status });
    }

    if (status !== "SUCCEEDED") {
      return NextResponse.json({
        pending: false,
        data: [],
        error: `La recherche a échoué (statut: ${status})`,
      });
    }

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
      username?: string;
      fullName?: string;
      full_name?: string;
      name?: string;
      biography?: string;
      profilePicUrl?: string;
      profile_pic_url?: string;
      [key: string]: unknown;
    }>;

    const results = items
      .filter((p) => p.username || p.fullName || p.full_name || p.name)
      .map((p, idx) => ({
        id: p.username || `ig-${idx}`,
        name: p.fullName || p.full_name || p.name || p.username || "",
        username: p.username || null,
        biography: p.biography || null,
        profile_url: p.username ? `https://instagram.com/${p.username}` : null,
        source: "search" as const,
      }));

    return NextResponse.json({ pending: false, data: results });
  } catch (err) {
    console.error("[Instagram Search Status] Error:", err);
    return NextResponse.json(
      { error: "Erreur lors de la vérification" },
      { status: 500 },
    );
  }
}
