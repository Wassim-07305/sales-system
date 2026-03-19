import { test, expect } from "@playwright/test";
import { loginAsAdmin, waitForPageReady } from "./helpers";

test.describe("FONCTIONNALITÉ 4 — ONBOARDING", () => {
  // ── Vue admin ──

  test("ONBOARD-01: Page onboarding en cours accessible (admin)", async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await page.goto("/settings/onboarding/en-cours");
    await waitForPageReady(page);

    const body = (await page.textContent("body")) || "";
    const hasContent =
      body.toLowerCase().includes("onboarding") ||
      body.toLowerCase().includes("en cours") ||
      body.toLowerCase().includes("aucun");

    expect(hasContent).toBeTruthy();
  });

  test("ONBOARD-02: Page settings onboarding accessible (admin)", async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await page.goto("/settings/onboarding");
    await waitForPageReady(page);

    const body = (await page.textContent("body")) || "";
    expect(body.length).toBeGreaterThan(100);
  });

  // ── Onboarding flow structure ──

  test("ONBOARD-03: La page /onboarding redirige un admin vers /dashboard", async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await page.goto("/onboarding");
    await page.waitForTimeout(3000);

    // Admin should be redirected (onboarding completed or role not b2c/b2b)
    const url = page.url();
    expect(url).toMatch(/\/(dashboard|settings|crm)/);
  });

  // ── Gating test (code-level verification) ──

  test("ONBOARD-04: Le code onboarding-flow.tsx contient le gating B2B", async ({}) => {
    // This is a code-level check — verify the fix was applied
    const fs = await import("fs");
    const content = fs.readFileSync(
      "/Users/gilles/Downloads/Projets Client/sales-system-main/src/app/(onboarding)/onboarding/onboarding-flow.tsx",
      "utf-8",
    );

    // B2B gating should exist
    expect(content).toContain("b2b_questionnaire");
    expect(content).toContain("!!company");
    expect(content).toContain("!!secteur");
    expect(content).toContain("!!offre");
    expect(content).toContain("!!cible");
    expect(content).toContain("generateB2BWorkspace");
  });

  test("ONBOARD-05: Le savedStep est passé depuis page.tsx", async ({}) => {
    const fs = await import("fs");
    const content = fs.readFileSync(
      "/Users/gilles/Downloads/Projets Client/sales-system-main/src/app/(onboarding)/onboarding/page.tsx",
      "utf-8",
    );

    expect(content).toContain("onboarding_step");
    expect(content).toContain("savedStep={profile?.onboarding_step");
  });

  test("ONBOARD-06: Le gating empêche de skip pour tous les rôles", async ({}) => {
    const fs = await import("fs");
    const content = fs.readFileSync(
      "/Users/gilles/Downloads/Projets Client/sales-system-main/src/app/(onboarding)/onboarding/onboarding-flow.tsx",
      "utf-8",
    );

    // goNext should check canProceed for all roles, not just B2C
    expect(content).toContain("if (!canProceed())");
    expect(content).not.toContain(
      'if (role === "client_b2c" && !canProceed())',
    );
  });
});
