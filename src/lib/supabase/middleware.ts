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

  // Landing page + marketing/legal pages are public for all users
  const isMarketingRoute = pathname === "/" || pathname.startsWith("/cgv") || pathname.startsWith("/mentions-legales") || pathname.startsWith("/confidentialite");

  if (!user && !isPublicRoute && !isMarketingRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && (pathname === "/login" || pathname === "/register" || pathname === "/forgot-password")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // Role-based route restrictions & onboarding check
  // Skip for API routes, public routes, marketing pages, and static assets
  const skipRoleCheck = pathname.startsWith("/api") || pathname.startsWith("/onboarding") || isPublicRoute || isMarketingRoute;
  if (user && !skipRoleCheck) {
    // Always fetch from DB to prevent cookie spoofing — cached for performance via httpOnly cookie
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

      // Cache role in httpOnly cookie for 5 minutes to reduce DB queries
      supabaseResponse.cookies.set("x-user-role", role || "", { maxAge: 300, path: "/", httpOnly: true, secure: true, sameSite: "lax" });
      supabaseResponse.cookies.set("x-onboarding-done", onboardingCompleted ? "1" : "0", { maxAge: 300, path: "/", httpOnly: true, secure: true, sameSite: "lax" });
    }

    // Onboarding redirect for clients
    if (
      role &&
      ["client_b2b", "client_b2c"].includes(role) &&
      !onboardingCompleted
    ) {
      const url = request.nextUrl.clone();
      url.pathname = "/onboarding";
      return NextResponse.redirect(url);
    }

    // Role-based route restrictions
    // Client roles can only access their specific routes
    if (role && ["client_b2b", "client_b2c"].includes(role)) {
      const clientAllowedRoutes = [
        "/dashboard", "/academy", "/profile", "/settings/subscription",
        "/settings/notifications", "/notifications", "/onboarding",
        "/portal", "/community", "/chat", "/resources", "/support",
        "/referral", "/challenges", "/kpis", "/bookings",
      ];
      // B2B entrepreneurs can also access the CRM (read-only view of their setters' deals)
      if (role === "client_b2b") {
        clientAllowedRoutes.push("/crm");
      }
      const isAllowed = clientAllowedRoutes.some((route) => pathname.startsWith(route));
      if (!isAllowed) {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard";
        return NextResponse.redirect(url);
      }
    }

    // Setter/closer cannot access admin-only routes
    if (role && ["setter", "closer"].includes(role)) {
      const adminOnlyRoutes = [
        "/settings/branding", "/settings/white-label", "/settings/onboarding",
        "/settings/ai-modes", "/settings/custom-fields", "/settings/integrations",
        "/settings/migration", "/settings/security", "/settings/privacy",
        "/settings/dashboard-builder",
      ];
      const isRestricted = adminOnlyRoutes.some((route) => pathname.startsWith(route));
      if (isRestricted) {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard";
        return NextResponse.redirect(url);
      }
    }
  }

  return supabaseResponse;
}
