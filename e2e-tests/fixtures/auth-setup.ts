import { test as setup } from "@playwright/test";
import { TEST_USERS } from "../helpers/test-users";
import path from "path";

const AUTH_DIR = path.resolve(__dirname, "../.auth");

/**
 * Auth setup — se connecte avec chaque utilisateur de test et sauvegarde
 * le storageState pour réutilisation dans les tests sans re-login.
 */
for (const [key, user] of Object.entries(TEST_USERS)) {
  setup(`authenticate ${key} (${user.role})`, async ({ page }) => {
    // Aller sur la page de login
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    // Remplir le formulaire
    await page.getByRole("textbox", { name: "Email" }).fill(user.email);
    await page
      .getByRole("textbox", { name: "Mot de passe" })
      .fill(user.password);
    await page.getByRole("button", { name: "Se connecter" }).click();

    // Attendre la redirection vers le dashboard ou l'onboarding
    await page.waitForURL(/\/(dashboard|onboarding|crm|portal)/, {
      timeout: 20_000,
    });

    // Sauvegarder l'état d'authentification
    const storagePath = path.resolve(AUTH_DIR, `${key}.json`);
    await page.context().storageState({ path: storagePath });
  });
}
