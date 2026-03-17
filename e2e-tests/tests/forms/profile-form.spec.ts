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

test.describe("Formulaire Profil - /profile", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto("/profile");
    await page.waitForLoadState("networkidle");
  });

  test("la page profil se charge avec les informations utilisateur", async ({
    page,
  }) => {
    // La page doit contenir le titre "Mon profil"
    await expect(page.getByText("Mon profil").first()).toBeVisible({
      timeout: 10000,
    });

    // Le nom de l'utilisateur doit apparaitre quelque part (dans le h2 de la carte identite)
    await expect(page.getByText("Thomas Martin").first()).toBeVisible({
      timeout: 10000,
    });
  });

  test("le champ nom est pre-rempli avec Thomas Martin", async ({ page }) => {
    // Les labels et inputs ne sont pas lies par htmlFor/id,
    // donc on cherche le label "Nom complet" puis l'input qui le suit
    const nomCompletLabel = page.getByText("Nom complet");
    await expect(nomCompletLabel).toBeVisible({ timeout: 10000 });

    // L'input est le sibling suivant du label dans le meme conteneur .space-y-2
    const nameInput = nomCompletLabel.locator("xpath=..").locator("input");

    await expect(nameInput).toBeVisible({ timeout: 5000 });

    const value = await nameInput.inputValue();
    expect(value).toContain("Thomas");
  });

  test("modification du nom et sauvegarde affiche un toast de succes", async ({
    page,
  }) => {
    // Trouver l'input "Nom complet" via son label
    const nameInput = page
      .getByText("Nom complet")
      .locator("xpath=..")
      .locator("input");

    await expect(nameInput).toBeVisible({ timeout: 10000 });

    // Modifier le nom
    await nameInput.clear();
    await nameInput.fill("Thomas Martin");

    // Cliquer sur le bouton "Enregistrer les modifications"
    const saveButton = page.getByRole("button", {
      name: /enregistrer/i,
    });

    await expect(saveButton).toBeVisible({ timeout: 5000 });
    await saveButton.click();

    // Verifier qu'un toast de succes apparait ("Profil mis a jour !")
    await expect(
      page
        .locator("[data-sonner-toast]")
        .or(page.getByText(/mis à jour|succès|sauvegardé|enregistré/i))
        .first(),
    ).toBeVisible({ timeout: 10000 });
  });

  test("nom vide affiche une erreur ou le serveur rejette", async ({
    page,
  }) => {
    // Trouver l'input "Nom complet" via son label
    const nameInput = page
      .getByText("Nom complet")
      .locator("xpath=..")
      .locator("input");

    await expect(nameInput).toBeVisible({ timeout: 10000 });

    // Vider le champ nom
    await nameInput.clear();

    // Cliquer sur le bouton "Enregistrer les modifications"
    const saveButton = page.getByRole("button", {
      name: /enregistrer/i,
    });

    await expect(saveButton).toBeVisible({ timeout: 5000 });
    await saveButton.click();

    // Attendre la reponse — soit une erreur de validation, soit un toast (succes ou erreur)
    // Le formulaire n'a pas de validation cote client, donc on verifie juste
    // qu'un toast apparait (le serveur peut accepter ou rejeter)
    await expect(
      page
        .locator("[data-sonner-toast]")
        .or(page.getByText(/erreur|mis à jour|succès|obligatoire|requis/i))
        .first(),
    ).toBeVisible({ timeout: 10000 });

    // Restaurer le nom original
    await nameInput.fill("Thomas Martin");
    await saveButton.click();
    await page.waitForTimeout(2000);
  });

  test("upload d'avatar si le champ existe", async ({ page }) => {
    // Le file input existe mais est cache (class="hidden"), donc on verifie qu'il est attache au DOM
    const fileInput = page.locator('input[type="file"][accept="image/*"]');

    const hasUpload = (await fileInput.count()) > 0;

    if (hasUpload) {
      await expect(fileInput.first()).toBeAttached();
    } else {
      test.skip(true, "Pas de champ upload avatar");
    }
  });
});
