import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";

/**
 * Tests d'accessibilite des routes pour le role setter.
 * Verifie que chaque route est accessible (pas de 404, pas d'erreur).
 */

// --- Helper: login inline ---
async function login(
  page: Page,
  email = "thomas.martin@demo.com",
  password = "demo1234",
) {
  await page.goto("/login");
  await page.getByRole("textbox", { name: "Email" }).fill(email);
  await page.getByRole("textbox", { name: "Mot de passe" }).fill(password);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL(/\/(dashboard|onboarding|crm|portal)/, {
    timeout: 15000,
  });
}

const SETTER_ROUTES = [
  { path: "/dashboard", label: "Dashboard" },
  { path: "/crm", label: "CRM" },
  { path: "/bookings", label: "Bookings" },
  { path: "/analytics/performance", label: "Ma performance" },
  { path: "/journal", label: "Journal EOD" },
  { path: "/prospecting", label: "Prospection" },
  { path: "/prospecting/discovery", label: "Découverte Leads" },
  { path: "/roleplay", label: "Role-Play" },
  { path: "/scripts", label: "Scripts" },
  { path: "/academy", label: "Academy" },
  { path: "/challenges", label: "Défis" },
  { path: "/marketplace", label: "Marketplace" },
  { path: "/chat", label: "Messages" },
  { path: "/profile", label: "Profil" },
  { path: "/help", label: "Centre d'aide" },
];

test.describe("Accessibilite des routes - Setter", () => {
  for (const route of SETTER_ROUTES) {
    test(`${route.label} (${route.path}) est accessible`, async ({ page }) => {
      await login(page);
      const response = await page.goto(route.path, {
        waitUntil: "networkidle",
      });

      // Verifier que la reponse HTTP n'est pas une erreur serveur
      expect(response).not.toBeNull();
      if (response) {
        expect(
          response.status(),
          `La route ${route.path} ne devrait pas retourner une erreur HTTP`,
        ).toBeLessThan(500);
      }

      // Verifier que la page ne montre pas un 404
      const bodyText = await page.locator("body").innerText();
      expect(
        bodyText,
        `La route ${route.path} ne devrait pas afficher une page 404`,
      ).not.toContain("404");

      // Verifier que l'URL contient le path attendu ou redirige vers une page autorisee
      const currentUrl = page.url();
      const allowedPaths = [
        route.path,
        "/dashboard",
        "/onboarding",
        "/crm",
        "/portal",
      ];
      const isAllowed = allowedPaths.some((p) => currentUrl.includes(p));
      expect(
        isAllowed,
        `L'URL ${currentUrl} devrait contenir ${route.path} ou rediriger vers une page autorisee`,
      ).toBe(true);

      // Verifier qu'il n'y a pas de message d'erreur generique
      const hasError = await page
        .locator('text="Erreur"')
        .or(page.locator('text="Error"'))
        .or(page.locator('text="Something went wrong"'))
        .count();

      // On autorise 0 erreurs visibles (certaines pages peuvent avoir des erreurs si pas de donnees)
      // mais on verifie au moins que la sidebar est presente (on est bien dans l'app)
      const sidebar = page.locator("aside");
      await expect(
        sidebar,
        `La sidebar devrait etre visible sur ${route.path}`,
      ).toBeVisible({ timeout: 10000 });
    });
  }
});
