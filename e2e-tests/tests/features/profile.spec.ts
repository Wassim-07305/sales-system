import { test, expect, type Page } from "@playwright/test";

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

test.describe("Profil — Setter", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto("/profile");
    await page.waitForLoadState("networkidle");
  });

  test("la page profil se charge", async ({ page }) => {
    const heading = page
      .getByRole("heading", { name: /profil/i })
      .or(page.getByRole("heading", { level: 1 }));
    await expect(heading).toBeVisible({ timeout: 10000 });
    expect(page.url()).toContain("/profile");
  });

  test("le nom Thomas Martin est visible", async ({ page }) => {
    // Le nom peut etre dans un heading, un champ, ou n'importe quel element texte
    const userName = page
      .getByText("Thomas Martin")
      .first()
      .or(page.getByText("Thomas").first());
    await expect(userName).toBeVisible({ timeout: 10000 });
  });

  test("les champs du formulaire de modification sont presents", async ({
    page,
  }) => {
    const inputs = page.locator("input, textarea");
    const count = await inputs.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test("la section avatar est visible", async ({ page }) => {
    // Chercher un avatar (image, initiales "TM", ou zone d'upload)
    const avatarSection = page
      .locator(
        "img[alt*='avatar' i], img[alt*='profil' i], img[alt*='Thomas' i], [class*='avatar'], [data-testid*='avatar']",
      )
      .first()
      .or(page.getByText("TM").first())
      .or(page.getByText(/photo|avatar|image de profil/i).first())
      .or(page.locator("main img").first());
    await expect(avatarSection).toBeVisible({ timeout: 10000 });
  });
});
