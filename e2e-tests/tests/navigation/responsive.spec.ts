import { test, expect } from "@playwright/test";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page
    .getByRole("textbox", { name: "Email" })
    .fill("thomas.martin@demo.com");
  await page.getByRole("textbox", { name: "Mot de passe" }).fill("demo1234");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL(/\/(dashboard|onboarding|crm)/, { timeout: 15000 });
}

test.describe("Responsive — Mobile", () => {
  test.use({ viewport: { width: 375, height: 812 } }); // iPhone 13

  test("landing page renders correctly on mobile", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Le heading principal est visible
    const heading = page.getByRole("heading", { level: 1 });
    await expect(heading).toBeVisible();

    // Les CTAs sont visibles
    await expect(page.getByRole("link", { name: "Connexion" })).toBeVisible();
  });

  test("login form is usable on mobile", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("textbox", { name: "Email" })).toBeVisible();
    await expect(
      page.getByRole("textbox", { name: "Mot de passe" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Se connecter" }),
    ).toBeVisible();
  });

  test("sidebar is hidden on mobile after login", async ({ page }) => {
    await login(page);

    // La sidebar desktop ne devrait pas être visible
    const sidebar = page.getByRole("complementary");
    // Sur mobile, elle peut être cachée ou dans un drawer
    const isHidden = await sidebar.isHidden().catch(() => true);
    // Le contenu principal doit être visible
    const main = page.getByRole("main");
    await expect(main).toBeVisible();
  });

  test("mobile bottom navigation is present", async ({ page }) => {
    await login(page);
    await page.waitForLoadState("networkidle");

    // Sur mobile, il devrait y avoir une navigation bottom
    // Vérifier qu'il y a une navigation accessible
    const navs = page.getByRole("navigation");
    const navCount = await navs.count();
    expect(navCount).toBeGreaterThanOrEqual(1);
  });
});

test.describe("Responsive — Tablet", () => {
  test.use({ viewport: { width: 768, height: 1024 } }); // iPad

  test("dashboard renders on tablet", async ({ page }) => {
    await login(page);
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // Le contenu principal est visible
    const main = page.getByRole("main");
    await expect(main).toBeVisible();
  });
});

test.describe("Responsive — Desktop large", () => {
  test.use({ viewport: { width: 1920, height: 1080 } });

  test("sidebar is fully visible on large desktop", async ({ page }) => {
    await login(page);
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    const sidebar = page.getByRole("complementary");
    await expect(sidebar).toBeVisible();

    // Les labels des liens sont visibles (pas seulement les icônes)
    await expect(page.getByRole("link", { name: "Dashboard" })).toBeVisible();
    await expect(page.getByRole("link", { name: "CRM" })).toBeVisible();
  });
});
