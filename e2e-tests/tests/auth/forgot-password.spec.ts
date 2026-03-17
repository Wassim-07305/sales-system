import { test, expect } from "@playwright/test";

test.describe("Forgot Password (/forgot-password)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/forgot-password");
    await page.waitForLoadState("networkidle");
  });

  test("la page affiche le champ email et le bouton de soumission", async ({
    page,
  }) => {
    await expect(page.getByRole("textbox", { name: "Email" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Réinitialiser le mot de passe" }),
    ).toBeVisible();
  });

  test("soumission avec un email valide affiche le message de succes", async ({
    page,
  }) => {
    await page
      .getByRole("textbox", { name: "Email" })
      .fill("thomas.martin@demo.com");
    await page
      .getByRole("button", { name: "Réinitialiser le mot de passe" })
      .click();

    // Apres soumission reussie, le message de confirmation s'affiche
    await expect(page.getByText("Email envoyé")).toBeVisible({
      timeout: 15000,
    });
    await expect(
      page.getByText("Un email de réinitialisation a été envoyé"),
    ).toBeVisible();
  });

  test("soumission avec email vide affiche une erreur de validation", async ({
    page,
  }) => {
    // Tenter de soumettre sans remplir le champ email
    await page
      .getByRole("button", { name: "Réinitialiser le mot de passe" })
      .click();

    // Le champ est required, la validation HTML native bloque
    const emailInput = page.getByRole("textbox", { name: "Email" });
    await expect(emailInput).toHaveAttribute("required", "");

    // On reste sur /forgot-password
    expect(page.url()).toContain("/forgot-password");
  });
});
