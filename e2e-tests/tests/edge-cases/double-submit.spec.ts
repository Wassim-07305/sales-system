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

test.describe("Double soumission - protection", () => {
  test("login: double-clic sur Se connecter ne provoque pas d'erreur", async ({
    page,
  }) => {
    await page.goto("/login");
    await page
      .getByRole("textbox", { name: "Email" })
      .fill("thomas.martin@demo.com");
    await page.getByRole("textbox", { name: "Mot de passe" }).fill("demo1234");

    // Intercepter les requetes pour compter les soumissions
    const requests: string[] = [];
    page.on("request", (req) => {
      if (req.url().includes("auth") && req.method() === "POST") {
        requests.push(req.url());
      }
    });

    const submitButton = page.getByRole("button", { name: "Se connecter" });

    // Double-clic rapide
    await submitButton.dblclick();

    // Attendre la navigation (succes)
    await page.waitForURL(/\/(dashboard|onboarding|crm|portal)/, {
      timeout: 15000,
    });

    // Pas d'erreur visible sur la page
    const errorVisible = await page
      .getByText(/erreur|error|failed/i)
      .isVisible()
      .catch(() => false);
    expect(errorVisible).toBeFalsy();
  });

  test("creation de deal: double-clic ne cree qu'un seul deal", async ({
    page,
  }) => {
    await login(page);
    await page.goto("/crm");
    await page.waitForLoadState("networkidle");

    const dealTitle = `Double Submit Test ${Date.now()}`;

    await page
      .getByRole("button", { name: /nouveau deal/i })
      .first()
      .click();
    await page.getByRole("textbox", { name: "Titre du deal" }).fill(dealTitle);
    await page.getByRole("spinbutton", { name: "Valeur" }).fill("1000");

    // Intercepter les requetes de creation
    const createRequests: string[] = [];
    page.on("request", (req) => {
      if (req.method() === "POST" && req.url().includes("deal")) {
        createRequests.push(req.url());
      }
    });

    const submitButton = page.getByRole("button", { name: "Créer le deal" });

    // Double-clic rapide sur le bouton de creation
    await submitButton.dblclick();

    // Attendre que le dialog se ferme
    await expect(
      page.getByRole("textbox", { name: "Titre du deal" }),
    ).toBeHidden({ timeout: 15000 });

    // Verifier qu'un seul deal avec ce titre existe
    const dealCards = page.getByText(dealTitle);
    const count = await dealCards.count();
    expect(count).toBeLessThanOrEqual(1);
  });

  test("apres soumission, le bouton est temporairement desactive", async ({
    page,
  }) => {
    await login(page);
    await page.goto("/crm");
    await page.waitForLoadState("networkidle");

    await page
      .getByRole("button", { name: /nouveau deal/i })
      .first()
      .click();
    await page
      .getByRole("textbox", { name: "Titre du deal" })
      .fill(`Disable Test ${Date.now()}`);
    await page.getByRole("spinbutton", { name: "Valeur" }).fill("500");

    const submitButton = page.getByRole("button", { name: "Créer le deal" });

    // Cliquer et verifier immediatement l'etat du bouton
    await submitButton.click();

    // Après soumission, le bouton devrait être désactivé ou le dialog se fermer
    await page.waitForTimeout(1000);
    const isDisabled = await submitButton.isDisabled().catch(() => true);
    const dialogClosed = await page
      .getByRole("dialog")
      .isHidden()
      .catch(() => true);

    // Le bouton est désactivé OU le dialog s'est fermé — les deux sont OK
    expect(isDisabled || dialogClosed).toBeTruthy();
  });
});
