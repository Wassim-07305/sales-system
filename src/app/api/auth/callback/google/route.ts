import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  // Rediriger vers la page calendar-sync avec le résultat
  const baseUrl = request.nextUrl.origin;
  const redirectUrl = new URL("/bookings/calendar-sync", baseUrl);

  if (error) {
    redirectUrl.searchParams.set("error", error);
    return NextResponse.redirect(redirectUrl);
  }

  if (!code) {
    redirectUrl.searchParams.set("error", "no_code");
    return NextResponse.redirect(redirectUrl);
  }

  // Échanger le code contre des tokens
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    redirectUrl.searchParams.set("error", "missing_config");
    return NextResponse.redirect(redirectUrl);
  }

  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: `${baseUrl}/api/auth/callback/google`,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      redirectUrl.searchParams.set("error", "token_exchange_failed");
      return NextResponse.redirect(redirectUrl);
    }

    const tokens = await tokenResponse.json();

    // Récupérer l'email Google
    let googleEmail: string | null = null;
    try {
      const userInfoResponse = await fetch(
        "https://www.googleapis.com/oauth2/v2/userinfo",
        { headers: { Authorization: `Bearer ${tokens.access_token}` } },
      );
      if (userInfoResponse.ok) {
        const userInfo = await userInfoResponse.json();
        googleEmail = userInfo.email || null;
      }
    } catch {
      // Non critique, on continue sans l'email
    }

    // Stocker les tokens dans user_settings
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirectUrl.searchParams.set("error", "not_authenticated");
      return NextResponse.redirect(redirectUrl);
    }

    await supabase.from("user_settings").upsert(
      {
        user_id: user.id,
        key: "google_calendar_tokens",
        value: {
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: Date.now() + (tokens.expires_in || 3600) * 1000,
          email: googleEmail,
        },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,key" },
    );

    redirectUrl.searchParams.set("connected", "true");
    return NextResponse.redirect(redirectUrl);
  } catch {
    redirectUrl.searchParams.set("error", "server_error");
    return NextResponse.redirect(redirectUrl);
  }
}
