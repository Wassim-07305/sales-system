import { test as setup, expect } from "@playwright/test";
import path from "path";

const ADMIN_FILE = path.join(__dirname, ".auth", "admin.json");

setup("authenticate as admin", async ({ page }) => {
  await page.goto("/login");
  await page.waitForLoadState("networkidle");

  await page.getByPlaceholder(/email/i).fill("gilles.hayibor@gmail.com");
  await page.getByPlaceholder(/mot de passe|password/i).fill("gillesaz");
  await page
    .getByRole("button", { name: /connexion|se connecter|login/i })
    .click();

  // Wait for redirect to dashboard
  await page.waitForURL(/\/(dashboard|crm|onboarding)/, { timeout: 30_000 });
  await page.context().storageState({ path: ADMIN_FILE });
});
