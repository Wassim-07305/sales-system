import { test, expect } from "@playwright/test";

test("DEBUG: Login with e2e-admin@test.com / TestAdmin2026", async ({
  page,
}) => {
  await page.goto("https://sales-system-six.vercel.app/login");
  await page.waitForLoadState("networkidle");

  await page.locator("#email").fill("e2e-admin@test.com");
  await page.locator("#password").fill("TestAdmin2026");

  page.on("response", (response) => {
    if (response.url().includes("auth")) {
      console.log(
        `RESPONSE: ${response.status()} ${response.url().substring(0, 100)}`,
      );
    }
  });

  await page.getByRole("button", { name: /se connecter/i }).click();
  console.log("Clicked login...");

  await page.waitForTimeout(8000);
  console.log("URL after 8s:", page.url());
  await page.screenshot({ path: "e2e-audit/screenshots/login-e2e-admin.png" });
});
