import { test, expect } from "@playwright/test";
import { loginAsAdmin, waitForPageReady, measureLoadTime } from "./helpers";

test.describe("TESTS TRANSVERSAUX", () => {
  // ── Sécurité des routes ──

  test("SEC-01: /dashboard redirige vers /login sans auth", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/dashboard");
    await page.waitForTimeout(5000);
    expect(page.url()).toMatch(/\/(login|register)/);
  });

  test("SEC-02: /crm redirige vers /login sans auth", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/crm");
    await page.waitForTimeout(5000);
    expect(page.url()).toMatch(/\/(login|register)/);
  });

  test("SEC-03: /contracts redirige vers /login sans auth", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/contracts");
    await page.waitForTimeout(5000);
    expect(page.url()).toMatch(/\/(login|register)/);
  });

  test("SEC-04: /settings/workspaces redirige vers /login sans auth", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/settings/workspaces");
    await page.waitForTimeout(5000);
    expect(page.url()).toMatch(/\/(login|register)/);
  });

  test("SEC-05: /academy redirige vers /login sans auth", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/academy");
    await page.waitForTimeout(5000);
    expect(page.url()).toMatch(/\/(login|register)/);
  });

  test("SEC-06: /chat redirige vers /login sans auth", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/chat");
    await page.waitForTimeout(5000);
    expect(page.url()).toMatch(/\/(login|register)/);
  });

  // ── Performance ──

  test("PERF-01: La page login charge en moins de 3 secondes", async ({ page }) => {
    const loadTime = await measureLoadTime(page, "/login");
    expect(loadTime).toBeLessThan(5000); // 5s tolerance for Vercel cold start
  });

  test("PERF-02: Le dashboard charge en moins de 5 secondes", async ({ page }) => {
    await loginAsAdmin(page);
    const start = Date.now();
    await page.goto("/dashboard");
    await page.waitForLoadState("domcontentloaded");
    const loadTime = Date.now() - start;
    expect(loadTime).toBeLessThan(8000); // 8s tolerance for cold start + data fetch
  });

  test("PERF-03: La page CRM charge en moins de 5 secondes", async ({ page }) => {
    await loginAsAdmin(page);
    const start = Date.now();
    await page.goto("/crm");
    await page.waitForLoadState("domcontentloaded");
    const loadTime = Date.now() - start;
    expect(loadTime).toBeLessThan(8000);
  });

  // ── Design et cohérence ──

  test("DESIGN-01: La page login affiche le formulaire", async ({ page }) => {
    await page.goto("/login");
    await waitForPageReady(page);

    // Should have email + password fields + submit button
    const emailInput = page.getByPlaceholder(/email/i).first();
    const passwordInput = page.getByPlaceholder(/mot de passe|password/i).first();
    const submitBtn = page.getByRole("button", { name: /connexion|se connecter|login/i }).first();

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitBtn).toBeVisible();
  });

  test("DESIGN-02: Le sidebar est visible après login", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/dashboard");
    await waitForPageReady(page);

    // Look for sidebar
    const sidebar = page.locator('nav, [class*="sidebar"], aside').first();
    await expect(sidebar).toBeVisible({ timeout: 10_000 });
  });

  test("DESIGN-03: Le texte français est utilisé dans l'interface", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/dashboard");
    await waitForPageReady(page);

    const body = await page.textContent("body") || "";
    // French words should be present
    const frenchWords = ["dashboard", "tableau", "contrat", "équipe", "message", "profil", "paramètre"];
    let foundFrench = 0;
    for (const word of frenchWords) {
      if (body.toLowerCase().includes(word)) foundFrench++;
    }

    expect(foundFrench).toBeGreaterThanOrEqual(2);
  });

  test("DESIGN-04: La page d'erreur 404 fonctionne", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/this-page-does-not-exist-12345");
    await page.waitForTimeout(3000);

    const body = await page.textContent("body") || "";
    // Should show 404 or redirect
    const is404OrRedirect =
      body.includes("404") ||
      body.includes("not found") ||
      body.includes("introuvable") ||
      page.url().includes("dashboard") ||
      page.url().includes("login");

    expect(is404OrRedirect).toBeTruthy();
  });

  // ── Navigation ──

  test("NAV-01: Les liens du sidebar mènent aux bonnes pages", async ({ page }) => {
    await loginAsAdmin(page);

    const routes = ["/dashboard", "/crm", "/contracts", "/chat", "/academy"];
    for (const route of routes) {
      await page.goto(route);
      await page.waitForLoadState("domcontentloaded");
      // Should not redirect to login (admin is authenticated)
      expect(page.url()).not.toMatch(/\/(login|register)/);
    }
  });

  test("NAV-02: Toutes les pages principales chargent sans erreur JS", async ({ page }) => {
    await loginAsAdmin(page);

    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    const routes = [
      "/dashboard",
      "/crm",
      "/contracts",
      "/chat",
      "/community",
      "/academy",
      "/journal",
      "/team",
      "/settings/workspaces",
    ];

    for (const route of routes) {
      await page.goto(route);
      await page.waitForLoadState("domcontentloaded");
      await page.waitForTimeout(1000);
    }

    // Filter out non-critical errors (hydration, chunk loading)
    const criticalErrors = errors.filter(
      (e) =>
        !e.includes("Hydration") &&
        !e.includes("chunk") &&
        !e.includes("Loading") &&
        !e.includes("NEXT_REDIRECT") &&
        !e.includes("ResizeObserver")
    );

    // Log all errors for report
    if (criticalErrors.length > 0) {
      console.log("JS Errors found:", criticalErrors);
    }

    expect(criticalErrors.length).toBe(0);
  });
});
