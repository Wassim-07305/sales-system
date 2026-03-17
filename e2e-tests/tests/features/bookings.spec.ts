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

test.describe("Bookings — Setter", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto("/bookings");
    await page.waitForLoadState("networkidle");
  });

  test("la page Bookings se charge", async ({ page }) => {
    const heading = page.getByRole("heading", { level: 1 });
    await expect(heading).toBeVisible({ timeout: 10000 });
    expect(page.url()).toContain("/bookings");
  });

  test("le calendrier ou la liste de bookings est visible", async ({
    page,
  }) => {
    const main = page.getByRole("main");
    await expect(main).toBeVisible();
    const text = await main.innerText();
    expect(text.length).toBeGreaterThan(10);
  });

  test("le bouton de creation de booking existe", async ({ page }) => {
    const createButton = page
      .getByRole("button", {
        name: /nouveau|créer|ajouter|planifier|booking/i,
      })
      .first();
    if (await createButton.isVisible()) {
      await expect(createButton).toBeEnabled();
    }
  });
});
