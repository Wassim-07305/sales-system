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

  // --- Tier 1: Unipile (3s timeout per request) ---
  try {
    const dsn = process.env.UNIPILE_DSN;
    const apiKey = process.env.UNIPILE_API_KEY;
    if (dsn && apiKey) {
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
          }>;
        };
        const liAccount = (accountsData.items || []).find(
          (a) =>
            (a.type || a.provider || "").toUpperCase() === "LINKEDIN",
        );

        if (liAccount) {
          const searchRes = await fetchWithTimeout(
            `${dsn}/api/v1/linkedin/search/people?account_id=${liAccount.id}&keyword=${encodeURIComponent(keyword)}&limit=20`,
            { headers: { "X-API-KEY": apiKey }, timeoutMs: 3000 },
          );
          if (searchRes.ok) {
            const data = (await searchRes.json()) as {
              items?: Array<{
                id?: string;
                first_name?: string;
                last_name?: string;
                headline?: string;
                public_identifier?: string;
                profile_url?: string;
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
    // Timeout or network error — skip to next tier
    console.error("[LinkedIn Search] Unipile error:", err instanceof Error ? err.message : err);
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

  // --- Tier 3: Start search actor ASYNC (returns immediately with runId) ---
  const apifyToken = process.env.APIFY_TOKEN;
  if (!apifyToken) {
    return NextResponse.json({
      data: [],
      error: "Aucun résultat trouvé. Clé API de recherche non configurée.",
    });
  }

  try {
    // Build structured input for the search actor
    const actorInput: Record<string, unknown> = {
      max_profiles: 20,
      include_email: false,
    };
    // Map filters to actor fields
    if (filters?.jobTitle?.trim()) {
      actorInput.current_job_title = filters.jobTitle.trim();
    }
    if (filters?.location?.trim()) {
      actorInput.location = filters.location.trim();
    }
    // Use query as name search (split into first/last if possible)
    if (query.trim()) {
      const parts = query.trim().split(/\s+/);
      if (parts.length >= 2) {
        actorInput.firstname = parts[0];
        actorInput.lastname = parts.slice(1).join(" ");
      } else {
        // Single word — use as job title if no job title filter, otherwise as lastname
        if (!actorInput.current_job_title) {
          actorInput.current_job_title = parts[0];
        } else {
          actorInput.lastname = parts[0];
        }
      }
    }

    // Start the actor WITHOUT waiting for finish (instant response)
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
      console.error("[LinkedIn Search] Search start error:", runRes.status);
      return NextResponse.json({
        data: [],
        error: "Erreur lors du lancement de la recherche.",
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
        error: "Erreur lors du lancement de la recherche.",
      });
    }

    // Return immediately — client will poll /api/linkedin-search/status
    return NextResponse.json({
      pending: true,
      runId,
      datasetId,
    });
  } catch (err) {
    console.error("[LinkedIn Search] Search start error:", err instanceof Error ? err.message : err);
    return NextResponse.json({
      data: [],
      error: "Erreur lors de la recherche.",
    });
  }
}
