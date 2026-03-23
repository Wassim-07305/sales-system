import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// POST /api/linkedin-search
// Tries fast tiers (Unipile, local DB) with strict timeouts.
// If all fail, starts search actor async and returns { pending: true, runId }.
// Each tier has a 3s timeout to stay well within Vercel Hobby's 10s limit.
// ---------------------------------------------------------------------------

/** Fetch with an AbortController timeout */
async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeoutMs?: number } = {},
): Promise<Response> {
  const { timeoutMs = 3000, ...fetchOptions } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...fetchOptions, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

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

  console.log("[LinkedIn Search] keyword:", keyword);

  // --- Tier 1: Unipile (3s timeout per request) ---
  try {
    const dsn = process.env.UNIPILE_DSN;
    const apiKey = process.env.UNIPILE_API_KEY;
    if (dsn && apiKey) {
      console.log("[LinkedIn Search] Tier 1: trying Unipile...");
      const accountsRes = await fetchWithTimeout(
        `${dsn}/api/v1/accounts`,
        { headers: { "X-API-KEY": apiKey }, timeoutMs: 3000 },
      );
      if (accountsRes.ok) {
        const accountsData = (await accountsRes.json()) as {
          items?: Array<{
            id: string;
            type?: string;
            provider?: string;
            name?: string;
          }>;
        };
        console.log(
          "[LinkedIn Search] Unipile accounts:",
          (accountsData.items || []).map((a) => ({
            id: a.id,
            type: a.type,
            provider: a.provider,
            name: a.name,
          })),
        );
        const liAccount = (accountsData.items || []).find(
          (a) =>
            (a.type || a.provider || "").toUpperCase() === "LINKEDIN",
        );

        if (liAccount) {
          const searchUrl = `${dsn}/api/v1/linkedin/search/people?account_id=${liAccount.id}&keyword=${encodeURIComponent(keyword)}&limit=20`;
          console.log("[LinkedIn Search] Unipile search URL:", searchUrl);
          const searchRes = await fetchWithTimeout(searchUrl, {
            headers: { "X-API-KEY": apiKey },
            timeoutMs: 3000,
          });
          console.log("[LinkedIn Search] Unipile search status:", searchRes.status);

          if (searchRes.ok) {
            const raw = await searchRes.text();
            console.log("[LinkedIn Search] Unipile raw response (first 500):", raw.slice(0, 500));
            const data = JSON.parse(raw) as {
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
              avatar_url: p.profile_picture_url || null,
              source: "unipile" as const,
            }));
            console.log("[LinkedIn Search] Unipile results:", results.length);
            if (results.length > 0) {
              return NextResponse.json({ data: results });
            }
          } else {
            const errBody = await searchRes.text().catch(() => "");
            console.error("[LinkedIn Search] Unipile search error:", searchRes.status, errBody.slice(0, 300));
          }
        } else {
          console.warn("[LinkedIn Search] No LinkedIn account found in Unipile");
        }
      } else {
        console.error("[LinkedIn Search] Unipile accounts fetch failed:", accountsRes.status);
      }
    } else {
      console.warn("[LinkedIn Search] Unipile not configured (missing DSN or API_KEY)");
    }
  } catch (err) {
    console.error("[LinkedIn Search] Unipile error:", err instanceof Error ? err.message : err);
  }

  // --- Tier 2: Local DB (instant) ---
  console.log("[LinkedIn Search] Tier 2: trying local DB...");
  if (query.trim()) {
    const { data: prospects } = await supabase
      .from("prospects")
      .select("id, name, profile_url, status")
      .eq("platform", "linkedin")
      .ilike("name", `%${query}%`)
      .limit(20);

    console.log("[LinkedIn Search] Local DB results:", prospects?.length ?? 0);

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

  // --- Tier 3: Start search actor ASYNC (returns immediately with runId) ---
  const apifyToken = process.env.APIFY_TOKEN;
  if (!apifyToken) {
    console.warn("[LinkedIn Search] No APIFY_TOKEN configured, returning empty");
    return NextResponse.json({
      data: [],
      error: "Aucun résultat trouvé via Unipile. Recherche Apify non configurée.",
    });
  }

  console.log("[LinkedIn Search] Tier 3: starting Apify actor...");
  try {
    const actorInput: Record<string, unknown> = {
      max_profiles: 20,
      include_email: false,
    };
    if (filters?.jobTitle?.trim()) {
      actorInput.current_job_title = filters.jobTitle.trim();
    }
    if (filters?.location?.trim()) {
      actorInput.location = filters.location.trim();
    }
    if (query.trim()) {
      const parts = query.trim().split(/\s+/);
      if (parts.length >= 2) {
        actorInput.firstname = parts[0];
        actorInput.lastname = parts.slice(1).join(" ");
      } else {
        if (!actorInput.current_job_title) {
          actorInput.current_job_title = parts[0];
        } else {
          actorInput.lastname = parts[0];
        }
      }
    }

    console.log("[LinkedIn Search] Apify input:", JSON.stringify(actorInput));

    const runRes = await fetchWithTimeout(
      `https://api.apify.com/v2/acts/apimaestro~linkedin-profile-search-scraper/runs?token=${apifyToken}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(actorInput),
        timeoutMs: 5000,
      },
    );

    if (!runRes.ok) {
      const errText = await runRes.text().catch(() => "");
      console.error("[LinkedIn Search] Apify start error:", runRes.status, errText.slice(0, 300));
      return NextResponse.json({
        data: [],
        error: "Recherche Apify indisponible. Vérifiez vos crédits Apify.",
      });
    }

    const run = (await runRes.json()) as {
      data?: { id?: string; defaultDatasetId?: string };
    };

    const runId = run.data?.id;
    const datasetId = run.data?.defaultDatasetId;
    console.log("[LinkedIn Search] Apify run started:", { runId, datasetId });

    if (!runId) {
      return NextResponse.json({
        data: [],
        error: "Erreur lors du lancement de la recherche.",
      });
    }

    return NextResponse.json({
      pending: true,
      runId,
      datasetId,
    });
  } catch (err) {
    console.error("[LinkedIn Search] Apify error:", err instanceof Error ? err.message : err);
    return NextResponse.json({
      data: [],
      error: "Erreur lors de la recherche.",
    });
  }
}
