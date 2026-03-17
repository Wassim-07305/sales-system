import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";

/**
 * Tests de la topbar (banner) — logged in as setter.
 * La topbar contient: breadcrumb (dans nav), bouton recherche, theme toggle, notifications, avatar.
 * Structure DOM observée: banner > navigation (breadcrumb) + button (search) + div (actions)
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

// =============================================================================
// 1. Breadcrumb affiche le bon titre de page
// =============================================================================
test.describe("Topbar - Breadcrumb", () => {
  const pages = [
    { path: "/dashboard", title: "Dashboard" },
    { path: "/crm", title: "CRM" },
    { path: "/bookings", title: "Bookings" },
    { path: "/academy", title: "Academy" },
    { path: "/prospecting", title: "Prospection" },
    { path: "/chat", title: "Messages" },
  ];

  for (const p of pages) {
    test(`affiche "${p.title}" sur ${p.path}`, async ({ page }) => {
      await login(page);
      await page.goto(p.path);
      await page.waitForLoadState("networkidle");

      // Le breadcrumb est dans le banner > navigation, sous forme de texte
      const banner = page.getByRole("banner");
      await expect(banner).toBeVisible();

      // Vérifier que le texte du breadcrumb contient le titre
      const breadcrumbNav = banner.getByRole("navigation");
      await expect(breadcrumbNav).toContainText(p.title);
    });
  }
});

// =============================================================================
// 2. Bouton de recherche ouvre la modale
// =============================================================================
test.describe("Topbar - Recherche", () => {
  test("le bouton Rechercher ouvre la modale de recherche", async ({
    page,
  }) => {
    await login(page);
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // Le bouton recherche contient "Rechercher..." et ⌘K
    const searchButton = page.getByRole("button", {
      name: /rechercher/i,
    });
    await expect(searchButton).toBeVisible();
    await searchButton.click();

    // Après clic, un dialog ou heading "Recherche" devrait être visible
    await page.waitForTimeout(500);
    const searchHeading = page.getByRole("heading", {
      name: /recherche/i,
    });
    const searchInput = page.locator(
      '[placeholder*="Rechercher"], [placeholder*="rechercher"]',
    );

    const headingVisible = await searchHeading.isVisible().catch(() => false);
    const inputVisible = await searchInput
      .first()
      .isVisible()
      .catch(() => false);

    expect(headingVisible || inputVisible).toBe(true);
  });
});

// =============================================================================
// 3. Bouton notifications visible
// =============================================================================
test.describe("Topbar - Notifications", () => {
  test("le bouton notifications est visible", async ({ page }) => {
    await login(page);
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // Le bouton Notifications est dans la topbar
    const notifButton = page.getByRole("button", {
      name: /notification/i,
    });
    await expect(notifButton).toBeVisible();
  });
});

// =============================================================================
// 4. Avatar utilisateur avec initiales
// =============================================================================
test.describe("Topbar - Avatar utilisateur", () => {
  test("les initiales TM du setter sont visibles", async ({ page }) => {
    await login(page);
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // Les initiales "TM" apparaissent dans la sidebar (complementary)
    // et possiblement dans la topbar
    const tmText = page.getByText("TM", { exact: true });
    await expect(tmText.first()).toBeVisible();
  });
});
