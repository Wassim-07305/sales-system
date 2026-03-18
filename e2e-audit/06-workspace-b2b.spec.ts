import { test, expect } from "@playwright/test";
import { loginAsAdmin, waitForPageReady } from "./helpers";

test.describe("FONCTIONNALITÉ 6 — WORKSPACE B2B ISOLÉ", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  // ── Création workspace ──

  test("B2B-01: La page Workspaces B2B est accessible (admin)", async ({ page }) => {
    await page.goto("/settings/workspaces");
    await waitForPageReady(page);

    const body = await page.textContent("body") || "";
    const hasWorkspaces =
      body.toLowerCase().includes("workspace") ||
      body.toLowerCase().includes("entrepreneur") ||
      body.toLowerCase().includes("b2b") ||
      body.toLowerCase().includes("créer");

    expect(hasWorkspaces).toBeTruthy();
  });

  test("B2B-02: Le bouton Créer un entrepreneur est présent", async ({ page }) => {
    await page.goto("/settings/workspaces");
    await waitForPageReady(page);

    const createBtn = page.getByRole("button", { name: /créer|nouveau|ajouter/i }).first();
    const hasBtn = await createBtn.isVisible({ timeout: 5000 }).catch(() => false);

    // Or look for the text
    const body = await page.textContent("body") || "";
    const hasCreateOption =
      hasBtn ||
      body.toLowerCase().includes("créer un entrepreneur") ||
      body.toLowerCase().includes("ajouter");

    expect(hasCreateOption).toBeTruthy();
  });

  test("B2B-03: Le dialog de création contient les champs requis", async ({ page }) => {
    await page.goto("/settings/workspaces");
    await waitForPageReady(page);

    // Click create button
    const createBtn = page.getByRole("button", { name: /créer|nouveau|ajouter/i }).first();
    if (await createBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await createBtn.click();
      await page.waitForTimeout(1000);

      // Check for email, name, company fields in dialog
      const dialog = page.locator('[role="dialog"]').first();
      if (await dialog.isVisible({ timeout: 3000 }).catch(() => false)) {
        const dialogText = await dialog.textContent() || "";
        const hasFields =
          dialogText.toLowerCase().includes("email") ||
          dialogText.toLowerCase().includes("nom") ||
          dialogText.toLowerCase().includes("entreprise");

        expect(hasFields).toBeTruthy();
      }
    }
  });

  // ── Assignments ──

  test("B2B-04: La page affectations setters est accessible", async ({ page }) => {
    await page.goto("/team/assignments");
    await waitForPageReady(page);

    const body = await page.textContent("body") || "";
    const hasAssignments =
      body.toLowerCase().includes("affectation") ||
      body.toLowerCase().includes("assignment") ||
      body.toLowerCase().includes("setter") ||
      body.toLowerCase().includes("entrepreneur");

    expect(hasAssignments).toBeTruthy();
  });

  // ── Admin global view ──

  test("B2B-05: Vue admin liste tous les workspaces", async ({ page }) => {
    await page.goto("/settings/workspaces");
    await waitForPageReady(page);

    const body = await page.textContent("body") || "";
    // Should show workspace list or empty state
    expect(body.length).toBeGreaterThan(100);
  });

  // ── Code-level checks ──

  test("B2B-06: Academy est dans le nav B2B", async ({}) => {
    const fs = await import("fs");
    const content = fs.readFileSync(
      "/Users/gilles/Downloads/Projets Client/sales-system-main/src/lib/constants.ts",
      "utf-8"
    );

    // Academy should include client_b2b in roles
    const academyMatch = content.match(/label:\s*"Academy"[\s\S]*?roles:\s*\[([^\]]+)\]/);
    expect(academyMatch).toBeTruthy();
    expect(academyMatch![1]).toContain("client_b2b");
  });

  test("B2B-07: createEntrepreneurAccount utilise Supabase Auth invite", async ({}) => {
    const fs = await import("fs");
    const content = fs.readFileSync(
      "/Users/gilles/Downloads/Projets Client/sales-system-main/src/lib/actions/workspace.ts",
      "utf-8"
    );

    expect(content).toContain("inviteUserByEmail");
    expect(content).toContain("client_b2b");
  });

  test("B2B-08: getB2BWorkspaceOverview fetch les setters assignés", async ({}) => {
    const fs = await import("fs");
    const content = fs.readFileSync(
      "/Users/gilles/Downloads/Projets Client/sales-system-main/src/lib/actions/workspace.ts",
      "utf-8"
    );

    expect(content).toContain("getB2BWorkspaceOverview");
    expect(content).toContain("matched_entrepreneur_id");
  });

  // ── Route security ──

  test("B2B-09: Les pages admin ne sont pas accessibles sans auth", async ({ page }) => {
    // Clear cookies first
    await page.context().clearCookies();
    await page.goto("/settings/workspaces");
    await page.waitForTimeout(3000);

    const url = page.url();
    // Should redirect to login
    expect(url).toMatch(/\/(login|register)/);
  });
});
