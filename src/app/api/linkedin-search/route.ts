import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// POST /api/linkedin-search
// Tries fast tiers (Unipile, LinkedIn API, local DB).
// If all fail, starts Apify actor async and returns { pending: true, runId }.
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const body = (await req.json()) as {
    query: string;
    filters?: { location?: string; jobTitle?: string };
  };

  const query = body.query || "";
  const filters = body.filters;

  if (
    !query.trim() &&
    !filters?.jobTitle?.trim() &&
    !filters?.location?.trim()
  ) {
    return NextResponse.json({ error: "Le terme de recherche est requis" });
  }

  const keyword = [query, filters?.jobTitle, filters?.location]
    .filter(Boolean)
    .join(" ");

  // --- Tier 1: Unipile (instant) ---
  try {
    const dsn = process.env.UNIPILE_DSN;
    const apiKey = process.env.UNIPILE_API_KEY;
    if (dsn && apiKey) {
      // Find LinkedIn account ID
      const accountsRes = await fetch(`${dsn}/api/v1/accounts`, {
        headers: { "X-API-KEY": apiKey },
      });
      if (accountsRes.ok) {
        const accountsData = (await accountsRes.json()) as {
          items?: Array<{
            id: string;
            type?: string;
            provider?: string;
          }>;
        };
        const liAccount = (accountsData.items || []).find(
          (a) =>
            (a.type || a.provider || "").toUpperCase() === "LINKEDIN",
        );

        if (liAccount) {
          const url = `${dsn}/api/v1/linkedin/search/people?account_id=${liAccount.id}&keyword=${encodeURIComponent(keyword)}&limit=20`;
          const res = await fetch(url, {
            headers: { "X-API-KEY": apiKey },
          });
          if (res.ok) {
            const data = (await res.json()) as {
              items?: Array<{
                id?: string;
                first_name?: string;
                last_name?: string;
                headline?: string;
                public_identifier?: string;
                profile_url?: string;
                profile_picture_url?: string;
              }>;
            };
            const results = (data.items || []).map((p) => ({
              id: p.id || p.public_identifier || "",
              name:
                [p.first_name, p.last_name].filter(Boolean).join(" ") || "",
              headline: p.headline || null,
              profile_url:
                p.profile_url ||
                (p.public_identifier
                  ? `https://linkedin.com/in/${p.public_identifier}`
                  : null),
              source: "unipile" as const,
            }));
            if (results.length > 0) {
              return NextResponse.json({ data: results });
            }
          }
        }
      }
    }
  } catch (err) {
    console.error("[LinkedIn Search] Unipile error:", err);
  }

  // --- Tier 2: Local DB (instant) ---
  if (query.trim()) {
    const { data: prospects } = await supabase
      .from("prospects")
      .select("id, name, profile_url, status")
      .eq("platform", "linkedin")
      .ilike("name", `%${query}%`)
      .limit(20);

    if (prospects && prospects.length > 0) {
      const results = prospects.map((p) => ({
        id: p.id,
        name: p.name,
        headline: null as string | null,
        profile_url: p.profile_url,
        source: "local_database" as const,
      }));
      return NextResponse.json({ data: results });
    }
  }

  // --- Tier 3: Start Apify actor ASYNC (returns immediately with runId) ---
  const apifyToken = process.env.APIFY_TOKEN;
  if (!apifyToken) {
    return NextResponse.json({
      data: [],
      error: "Aucun résultat trouvé. APIFY_TOKEN non configuré.",
    });
  }

  try {
    const searchUrl = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(keyword)}`;

    // Start the actor WITHOUT waiting for finish (instant response)
    const runRes = await fetch(
      `https://api.apify.com/v2/acts/supreme_coder~linkedin-profile-scraper/runs?token=${apifyToken}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          urls: [{ url: searchUrl }],
        }),
      },
    );

    if (!runRes.ok) {
      console.error("[LinkedIn Search] Apify start error:", runRes.status);
      return NextResponse.json({
        data: [],
        error: "Erreur lors du lancement de la recherche Apify.",
      });
    }

    const run = (await runRes.json()) as {
      data?: { id?: string; defaultDatasetId?: string };
    };

    const runId = run.data?.id;
    const datasetId = run.data?.defaultDatasetId;

    if (!runId) {
      return NextResponse.json({
        data: [],
        error: "Erreur: pas de runId Apify.",
      });
    }

    // Return immediately — client will poll /api/linkedin-search/status
    return NextResponse.json({
      pending: true,
      runId,
      datasetId,
    });
  } catch (err) {
    console.error("[LinkedIn Search] Apify start error:", err);
    return NextResponse.json({
      data: [],
      error: "Erreur lors de la recherche.",
    });
  }
}
