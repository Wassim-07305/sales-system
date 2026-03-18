import { Page, expect } from "@playwright/test";

export const ADMIN_EMAIL = "e2e-admin@test.com";
export const ADMIN_PASSWORD = "TestAdmin2026";
export const BASE_URL = "https://sales-system-six.vercel.app";

export async function loginAs(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.waitForLoadState("networkidle");

  // Use exact selectors from login-form.tsx
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: /se connecter/i }).click();

  // Wait for redirect away from login
  await page.waitForURL((url) => !url.pathname.includes("/login"), {
    timeout: 30_000,
  });
}

export async function loginAsAdmin(page: Page) {
  await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
}

/** Wait for page to be fully loaded */
export async function waitForPageReady(page: Page) {
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(500);
}

/** Measure page load time */
export async function measureLoadTime(page: Page, url: string): Promise<number> {
  const start = Date.now();
  await page.goto(url);
  await page.waitForLoadState("domcontentloaded");
  return Date.now() - start;
}
