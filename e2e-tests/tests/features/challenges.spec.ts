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

test.describe("Challenges / Gamification — Setter", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("la page defis se charge", async ({ page }) => {
    await page.goto("/challenges");
    await page.waitForLoadState("networkidle");

    const main = page.getByRole("main");
    await expect(main).toBeVisible();
  });

  test("la liste ou les cartes de defis sont visibles", async ({ page }) => {
    await page.goto("/challenges");
    await page.waitForLoadState("networkidle");

    const main = page.getByRole("main");
    const text = await main.innerText();
    expect(text.length).toBeGreaterThan(10);
  });

  test("le systeme de points/niveau est visible", async ({ page }) => {
    await page.goto("/challenges");
    await page.waitForLoadState("networkidle");

    // Verifier la presence d'indicateurs de gamification
    const gamificationContent = page
      .getByText(
        /points|niveau|level|xp|débutant|confirmé|senior|elite|légende/i,
      )
      .first();
    await expect(gamificationContent).toBeVisible({ timeout: 10000 });
  });

  test("la section recompenses est accessible", async ({ page }) => {
    await page.goto("/challenges/rewards");
    await page.waitForLoadState("networkidle");

    expect(page.url()).toContain("/challenges/rewards");
    const heading = page
      .getByRole("heading", { name: /récompenses|rewards/i })
      .or(page.getByRole("heading", { level: 1 }));
    await expect(heading).toBeVisible({ timeout: 10000 });
  });
});
