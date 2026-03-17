import { test, expect } from "@playwright/test";

test.describe("Register (/register)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/register");
    await page.waitForLoadState("networkidle");
  });

  test("la page affiche les champs du formulaire d'inscription", async ({
    page,
  }) => {
    await expect(
      page.getByRole("textbox", { name: "Nom complet" }),
    ).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Email" })).toBeVisible();
    await expect(
      page.getByRole("textbox", { name: "Mot de passe" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Créer mon compte" }),
    ).toBeVisible();
  });

  test("soumission sans champs requis affiche une erreur de validation", async ({
    page,
  }) => {
    // Tenter de soumettre sans remplir aucun champ
    await page.getByRole("button", { name: "Créer mon compte" }).click();

    // Les champs sont required, la validation HTML native bloque
    const nameInput = page.getByRole("textbox", { name: "Nom complet" });
    await expect(nameInput).toHaveAttribute("required", "");

    // On reste sur /register
    expect(page.url()).toContain("/register");
  });

  test("un email au format invalide affiche une erreur", async ({ page }) => {
    await page.getByRole("textbox", { name: "Nom complet" }).fill("Test User");
    await page.getByRole("textbox", { name: "Email" }).fill("email-invalide");
    await page
      .getByRole("textbox", { name: "Mot de passe" })
      .fill("MotDePasse123!");
    await page.getByRole("button", { name: "Créer mon compte" }).click();

    // Le champ email de type="email" bloque la soumission via validation native
    const emailInput = page.getByRole("textbox", { name: "Email" });
    await expect(emailInput).toHaveAttribute("type", "email");

    // On reste sur /register
    expect(page.url()).toContain("/register");
  });

  test("un mot de passe trop court affiche l'indicateur 'Trop court'", async ({
    page,
  }) => {
    await page.getByRole("textbox", { name: "Mot de passe" }).fill("abc");

    // L'indicateur de force affiche "Trop court"
    await expect(page.getByText("Trop court")).toBeVisible();

    // Tenter de soumettre avec tous les champs remplis
    await page.getByRole("textbox", { name: "Nom complet" }).fill("Test User");
    await page.getByRole("textbox", { name: "Email" }).fill("test@example.com");
    await page.getByRole("button", { name: "Créer mon compte" }).click();

    // Le champ a minLength=8, la validation native bloque
    const passwordInput = page.getByRole("textbox", { name: "Mot de passe" });
    await expect(passwordInput).toHaveAttribute("minlength", "8");

    // On reste sur /register
    expect(page.url()).toContain("/register");
  });

  test("inscription valide avec un email unique affiche le message de succes", async ({
    page,
  }) => {
    const uniqueEmail = `test-${Date.now()}@e2e.test`;

    await page
      .getByRole("textbox", { name: "Nom complet" })
      .fill("E2E Test User");
    await page.getByRole("textbox", { name: "Email" }).fill(uniqueEmail);
    await page
      .getByRole("textbox", { name: "Mot de passe" })
      .fill("SecurePassword123!");
    await page.getByRole("button", { name: "Créer mon compte" }).click();

    // Apres inscription reussie, le message de confirmation s'affiche
    await expect(page.getByText("Compte créé avec succès")).toBeVisible({
      timeout: 15000,
    });
    await expect(
      page.getByText("Un email de confirmation a été envoyé"),
    ).toBeVisible();
  });
});
