import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// Simple in-memory rate limiter
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 100; // requests per minute
const RATE_WINDOW = 60_000; // 1 minute

export async function validateApiRequest(request: NextRequest) {
  const authHeader = request.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return {
      error: NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Token manquant. Utilisez: Authorization: Bearer <token>" } },
        { status: 401 }
      ),
      user: null,
    };
  }

  const token = authHeader.replace("Bearer ", "");

  // Validate via Supabase
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    return {
      error: NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Token invalide ou expiré" } },
        { status: 401 }
      ),
      user: null,
    };
  }

  // Rate limiting
  const now = Date.now();
  const key = user.id;
  const entry = rateLimitMap.get(key);

  if (entry && entry.resetAt > now) {
    if (entry.count >= RATE_LIMIT) {
      return {
        error: NextResponse.json(
          { error: { code: "RATE_LIMITED", message: `Limite de ${RATE_LIMIT} requêtes/minute dépassée` } },
          {
            status: 429,
            headers: { "Retry-After": String(Math.ceil((entry.resetAt - now) / 1000)) },
          }
        ),
        user: null,
      };
    }
    entry.count++;
  } else {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_WINDOW });
  }

  return { error: null, user, supabase };
}

export function jsonResponse(data: unknown, meta?: { page: number; limit: number; total: number | null }) {
  return NextResponse.json({ data, meta: meta || undefined });
}

export function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}
