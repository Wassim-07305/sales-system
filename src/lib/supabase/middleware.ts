import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Public routes that don't require auth
  const publicRoutes = ["/login", "/register", "/book", "/forgot-password", "/reset-password"];
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));

  if (!user && !isPublicRoute && pathname !== "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && (pathname === "/login" || pathname === "/register" || pathname === "/forgot-password")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // Landing page at "/" is public for all users (authenticated and unauthenticated)

  // Redirect clients with incomplete onboarding to /onboarding
  // Skip DB query for API routes and paths that don't need onboarding check
  const skipOnboardingCheck = pathname.startsWith("/api") || pathname.startsWith("/onboarding");
  if (user && !skipOnboardingCheck && !isPublicRoute) {
    // Check cookie cache first to avoid DB query on every request
    const cachedRole = request.cookies.get("x-user-role")?.value;
    const cachedOnboarding = request.cookies.get("x-onboarding-done")?.value;

    let role = cachedRole;
    let onboardingCompleted = cachedOnboarding === "1";

    if (!cachedRole) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, onboarding_completed")
        .eq("id", user.id)
        .single();

      role = profile?.role || "";
      onboardingCompleted = profile?.onboarding_completed ?? true;

      // Cache role in cookie for 5 minutes to reduce DB queries
      supabaseResponse.cookies.set("x-user-role", role || "", { maxAge: 300, path: "/", httpOnly: true, secure: true, sameSite: "lax" });
      supabaseResponse.cookies.set("x-onboarding-done", onboardingCompleted ? "1" : "0", { maxAge: 300, path: "/", httpOnly: true, secure: true, sameSite: "lax" });
    }

    if (
      role &&
      ["client_b2b", "client_b2c"].includes(role) &&
      !onboardingCompleted
    ) {
      const url = request.nextUrl.clone();
      url.pathname = "/onboarding";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
