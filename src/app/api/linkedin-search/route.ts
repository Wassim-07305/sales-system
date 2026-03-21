import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { searchLinkedInProfiles } from "@/lib/actions/linkedin-api";

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const body = (await req.json()) as {
      query: string;
      filters?: { location?: string; jobTitle?: string };
    };

    const result = await searchLinkedInProfiles(
      body.query || "",
      body.filters,
    );

    return NextResponse.json(result);
  } catch (err) {
    console.error("[API] LinkedIn search error:", err);
    return NextResponse.json(
      { error: "Erreur lors de la recherche" },
      { status: 500 },
    );
  }
}
