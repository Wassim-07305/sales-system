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

test.describe("Chat / Messages — Setter", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto("/chat");
    await page.waitForLoadState("networkidle");
  });

  test("la page chat se charge", async ({ page }) => {
    expect(page.url()).toContain("/chat");
    const heading = page
      .getByRole("heading", { name: /messages/i })
      .or(page.getByRole("heading", { level: 1 }));
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test("la liste de channels ou conversations est visible", async ({
    page,
  }) => {
    const channelList = page
      .locator(
        "[class*='channel'], [class*='conversation'], [data-testid*='channel'], aside, nav",
      )
      .filter({ hasText: /général|team|direct|canal/i })
      .first()
      .or(page.getByText(/canal|conversation|message/i).first());
    await expect(channelList).toBeVisible({ timeout: 10000 });
  });

  test("le champ de saisie de message existe", async ({ page }) => {
    // Le champ de saisie n'apparait qu'apres avoir selectionne un channel
    // Essayer de cliquer sur le premier channel/conversation disponible
    const channelLink = page
      .locator("a[href*='/chat/'], [class*='channel'], [class*='conversation']")
      .first()
      .or(page.getByText(/général|team|direct|canal/i).first());
    if (await channelLink.isVisible().catch(() => false)) {
      await channelLink.click();
      await page.waitForTimeout(1000);
    }

    const messageInput = page
      .getByPlaceholder(/message|écrire|taper/i)
      .or(page.locator("textarea, input[type='text']").last());
    await expect(messageInput).toBeVisible({ timeout: 10000 });
  });

  test("on peut taper un message dans le champ de saisie", async ({ page }) => {
    // Le champ de saisie n'apparait qu'apres avoir selectionne un channel
    const channelLink = page
      .locator("a[href*='/chat/'], [class*='channel'], [class*='conversation']")
      .first()
      .or(page.getByText(/général|team|direct|canal/i).first());
    if (await channelLink.isVisible().catch(() => false)) {
      await channelLink.click();
      await page.waitForTimeout(1000);
    }

    const messageInput = page
      .getByPlaceholder(/message|écrire|taper/i)
      .or(page.locator("textarea, input[type='text']").last());
    await expect(messageInput).toBeVisible({ timeout: 10000 });
    await messageInput.fill("Test message E2E");
    await expect(messageInput).toHaveValue("Test message E2E");
  });
});
