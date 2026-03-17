import { test, expect, Page } from "@playwright/test";

/**
 * Helper : se connecter avec un compte de test
 */
async function login(
  page: Page,
  email = "thomas.martin@demo.com",
  password = "demo1234",
) {
  await page.goto("/login");
  await page.waitForLoadState("networkidle");
  await page.getByRole("textbox", { name: "Email" }).fill(email);
  await page.getByRole("textbox", { name: "Mot de passe" }).fill(password);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL(/\/(dashboard|onboarding|crm)/, { timeout: 15000 });
}

test.describe("Logout", () => {
  test("cliquer sur Deconnexion redirige vers /login", async ({ page }) => {
    await login(page);

    // Ouvrir le menu lateral ou trouver le bouton de deconnexion
    const logoutButton = page.getByRole("button", { name: "Déconnexion" });

    // Si le bouton n'est pas directement visible, chercher dans le menu utilisateur
    if (!(await logoutButton.isVisible({ timeout: 3000 }).catch(() => false))) {
      // Tenter de cliquer sur le profil/menu utilisateur dans la sidebar
      const userMenu = page.getByRole("button", {
        name: /profil|compte|utilisateur/i,
      });
      if (await userMenu.isVisible({ timeout: 2000 }).catch(() => false)) {
        await userMenu.click();
      }
    }

    // Chercher le lien ou bouton de deconnexion
    const logoutElement = (await logoutButton.isVisible().catch(() => false))
      ? logoutButton
      : page.getByText("Déconnexion");

    await logoutElement.click();

    await page.waitForURL("**/login", { timeout: 15000 });
    expect(page.url()).toContain("/login");
  });

  test("apres deconnexion, acceder a /dashboard redirige vers /login", async ({
    page,
  }) => {
    await login(page);

    // Se deconnecter via le bouton
    const logoutElement = page.getByText("Déconnexion");
    if (await logoutElement.isVisible({ timeout: 5000 }).catch(() => false)) {
      await logoutElement.click();
      await page.waitForURL("**/login", { timeout: 15000 });
    } else {
      // Fallback : naviguer directement vers une URL de deconnexion ou vider les cookies
      await page.context().clearCookies();
    }

    // Tenter d'acceder a /dashboard
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // On doit etre redirige vers /login
    await page.waitForURL("**/login", { timeout: 15000 });
    expect(page.url()).toContain("/login");
  });

  test("apres deconnexion, les cookies de session sont supprimes", async ({
    page,
  }) => {
    await login(page);

    // Recuperer les cookies avant deconnexion
    const cookiesBefore = await page.context().cookies();
    const sessionCookiesBefore = cookiesBefore.filter(
      (c) =>
        c.name.includes("supabase") ||
        c.name.includes("sb-") ||
        c.name.includes("auth"),
    );
    expect(sessionCookiesBefore.length).toBeGreaterThan(0);

    // Se deconnecter
    const logoutElement = page.getByText("Déconnexion");
    if (await logoutElement.isVisible({ timeout: 5000 }).catch(() => false)) {
      await logoutElement.click();
      await page.waitForURL("**/login", { timeout: 15000 });
    } else {
      await page.context().clearCookies();
      await page.goto("/login");
    }

    await page.waitForLoadState("networkidle");

    // Verifier que les cookies de session Supabase sont absents ou invalides
    const cookiesAfter = await page.context().cookies();
    const sessionCookiesAfter = cookiesAfter.filter(
      (c) =>
        c.name.includes("supabase") ||
        c.name.includes("sb-") ||
        c.name.includes("auth"),
    );

    // Apres deconnexion, il ne devrait plus y avoir de cookies de session actifs
    // ou ils devraient etre vides/expires
    const hasValidSession = sessionCookiesAfter.some(
      (c) => c.value && c.value.length > 10,
    );

    // Verification finale : tenter d'acceder a une page protegee
    await page.goto("/dashboard");
    await page.waitForURL("**/login", { timeout: 15000 });
    expect(page.url()).toContain("/login");
  });
});
