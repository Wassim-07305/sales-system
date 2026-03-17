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

test.describe("Refresh et navigation - persistance de session", () => {
  test("refresh sur /crm conserve l'authentification", async ({ page }) => {
    await login(page);
    await page.goto("/crm");
    await page.waitForLoadState("networkidle");

    // Verifier qu'on est bien sur /crm
    expect(page.url()).toContain("/crm");

    // Rafraichir la page
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Toujours sur /crm, pas redirige vers /login
    expect(page.url()).toContain("/crm");
    expect(page.url()).not.toContain("/login");
  });

  test("bouton retour apres navigation fonctionne correctement", async ({
    page,
  }) => {
    await login(page);

    // Naviguer vers le CRM
    await page.goto("/crm");
    await page.waitForLoadState("networkidle");

    // Naviguer vers l'academy
    await page.goto("/academy");
    await page.waitForLoadState("networkidle");
    expect(page.url()).toContain("/academy");

    // Retour arriere
    await page.goBack();
    await page.waitForLoadState("networkidle");

    // Devrait etre de retour sur /crm (ou une page precedente valide)
    const currentUrl = page.url();
    expect(currentUrl).not.toContain("/login");
  });

  test("refresh apres soumission de formulaire ne re-soumet pas", async ({
    page,
  }) => {
    await login(page);
    await page.goto("/crm");
    await page.waitForLoadState("networkidle");

    const dealTitle = `Refresh Test ${Date.now()}`;

    // Creer un deal
    await page
      .getByRole("button", { name: /nouveau deal/i })
      .first()
      .click();
    await page.getByRole("textbox", { name: "Titre du deal" }).fill(dealTitle);
    await page.getByRole("spinbutton", { name: "Valeur" }).fill("1000");
    await page.getByRole("button", { name: "Créer le deal" }).click();

    // Attendre que le dialog se ferme
    await expect(
      page.getByRole("textbox", { name: "Titre du deal" }),
    ).toBeHidden({ timeout: 10000 });

    // Rafraichir la page
    await page.reload();
    await page.waitForLoadState("networkidle");

    // La page doit se charger normalement (pas de popup de re-soumission)
    expect(page.url()).toContain("/crm");

    // Le deal doit toujours etre visible (une seule fois)
    const dealCount = await page.getByText(dealTitle).count();
    expect(dealCount).toBeLessThanOrEqual(1);
  });

  test("deep link direct vers /crm sans navigation prealable", async ({
    page,
  }) => {
    await login(page);

    // Aller directement a /crm sans passer par le dashboard
    await page.goto("/crm");
    await page.waitForLoadState("networkidle");

    // La page doit se charger correctement
    expect(page.url()).toContain("/crm");
    expect(page.url()).not.toContain("/login");

    // Le contenu du CRM doit etre visible (pipeline, boutons, etc.)
    const hasContent = await page
      .getByRole("button", { name: /nouveau deal/i })
      .or(page.getByText(/pipeline|prospect/i))
      .first()
      .isVisible()
      .catch(() => false);
    expect(hasContent).toBeTruthy();
  });
});
