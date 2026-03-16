import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  let next = searchParams.get("next") ?? "/dashboard";

  // Prevent open redirect — only allow relative paths
  if (!next.startsWith("/") || next.startsWith("//") || next.includes("://")) {
    next = "/dashboard";
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  // En cas d'erreur, rediriger vers la page de login
  return NextResponse.redirect(
    new URL("/login?error=auth_callback_failed", request.url),
  );
}
