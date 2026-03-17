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

test.describe("Prospecting — Setter", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("la page prospection se charge", async ({ page }) => {
    await page.goto("/prospecting");
    await page.waitForLoadState("networkidle");

    const heading = page
      .getByRole("heading", { name: /prospection/i })
      .or(page.getByRole("heading", { level: 1 }));
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test("la section hub est visible", async ({ page }) => {
    await page.goto("/prospecting");
    await page.waitForLoadState("networkidle");

    const main = page.getByRole("main");
    await expect(main).toBeVisible();
    const text = await main.innerText();
    expect(text.length).toBeGreaterThan(10);
  });

  test("la page decouverte leads se charge", async ({ page }) => {
    await page.goto("/prospecting/discovery");
    await page.waitForLoadState("networkidle");

    expect(page.url()).toContain("/prospecting/discovery");
    const heading = page
      .getByRole("heading", { name: /découverte|leads/i })
      .or(page.getByRole("heading", { level: 1 }));
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test("la page templates est accessible", async ({ page }) => {
    await page.goto("/prospecting/templates");
    await page.waitForLoadState("networkidle");

    expect(page.url()).toContain("/prospecting/templates");
    const heading = page
      .getByRole("heading", { name: /templates|modèles/i })
      .or(page.getByRole("heading", { level: 1 }));
    await expect(heading).toBeVisible({ timeout: 10000 });
  });
});
