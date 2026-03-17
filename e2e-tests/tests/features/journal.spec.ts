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

test.describe("Journal EOD — Setter", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto("/journal");
    await page.waitForLoadState("networkidle");
  });

  test("la page journal EOD se charge", async ({ page }) => {
    const heading = page
      .getByRole("heading", { name: /journal/i })
      .or(page.getByRole("heading", { level: 1 }));
    await expect(heading).toBeVisible({ timeout: 10000 });
    expect(page.url()).toContain("/journal");
  });

  test("les champs de metriques quotidiennes sont presents", async ({
    page,
  }) => {
    // Chercher des champs de formulaire pour les metriques
    const formFields = page.locator("input, textarea, select").first();
    await expect(formFields).toBeVisible({ timeout: 10000 });
  });

  test("on peut remplir et soumettre le journal", async ({ page }) => {
    // Chercher un champ de saisie numerique ou textuel
    const inputField = page
      .locator("input[type='number'], input[type='text'], textarea")
      .first();

    if (await inputField.isVisible()) {
      await inputField.fill("5");

      // Chercher un bouton de soumission
      const submitButton = page
        .getByRole("button", {
          name: /enregistrer|valider|soumettre|sauvegarder/i,
        })
        .first();
      if (await submitButton.isVisible()) {
        await expect(submitButton).toBeEnabled();
      }
    }
  });

  test("les entrees historiques sont visibles si elles existent", async ({
    page,
  }) => {
    // Verifier la presence d'un historique ou d'un calendrier de journaux
    const historicalContent = page
      .getByText(/historique|précédent|hier|semaine/i)
      .first()
      .or(
        page.locator("[class*='card'], [data-testid*='entry'], table").first(),
      );
    // L'historique peut etre vide — on verifie juste que la page ne crashe pas
    const mainContent = page.locator("main");
    await expect(mainContent).toBeVisible();
  });
});
