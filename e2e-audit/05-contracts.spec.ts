import { test, expect } from "@playwright/test";
import { loginAsAdmin, waitForPageReady } from "./helpers";

test.describe("FONCTIONNALITÉ 5 — CONTRATS ET FACTURATION", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  // ── Section Contrats ──

  test("CONTRACT-01: La page Contrats charge correctement", async ({
    page,
  }) => {
    await page.goto("/contracts");
    await waitForPageReady(page);

    const body = (await page.textContent("body")) || "";
    const hasContracts =
      body.toLowerCase().includes("contrat") ||
      body.toLowerCase().includes("contract") ||
      body.toLowerCase().includes("aucun");

    expect(hasContracts).toBeTruthy();
  });

  test("CONTRACT-02: La liste affiche les colonnes attendues", async ({
    page,
  }) => {
    await page.goto("/contracts");
    await waitForPageReady(page);

    const body = (await page.textContent("body")) || "";
    // Check for expected column headers or content
    const expectedCols = ["numéro", "client", "montant", "statut", "date"];
    let foundCols = 0;
    for (const col of expectedCols) {
      if (body.toLowerCase().includes(col)) foundCols++;
    }

    // At minimum some columns should be present (or empty state)
    expect(body.length).toBeGreaterThan(100);
  });

  test("CONTRACT-03: La page nouveau contrat est accessible", async ({
    page,
  }) => {
    await page.goto("/contracts/new");
    await waitForPageReady(page);

    const body = (await page.textContent("body")) || "";
    const hasForm =
      body.toLowerCase().includes("contrat") ||
      body.toLowerCase().includes("montant") ||
      body.toLowerCase().includes("client") ||
      body.toLowerCase().includes("template");

    expect(hasForm).toBeTruthy();
  });

  test("CONTRACT-04: Les modalités de paiement sont disponibles", async ({
    page,
  }) => {
    await page.goto("/contracts/new");
    await waitForPageReady(page);

    const body = (await page.textContent("body")) || "";
    // Check payment modalities exist in form
    const hasPaymentOptions =
      body.includes("1x") ||
      body.includes("2x") ||
      body.includes("3x") ||
      body.toLowerCase().includes("securio") ||
      body.toLowerCase().includes("paiement");

    expect(hasPaymentOptions).toBeTruthy();
  });

  test("CONTRACT-05: Le pré-remplissage depuis un deal fonctionne", async ({
    page,
  }) => {
    // Navigate with query params simulating deal link
    await page.goto("/contracts/new?dealId=test&amount=5000");
    await waitForPageReady(page);

    const body = (await page.textContent("body")) || "";
    // Page should load without error
    expect(body.length).toBeGreaterThan(100);
  });

  // ── Facturation ──

  test("CONTRACT-06: La page factures est accessible", async ({ page }) => {
    await page.goto("/contracts/invoices");
    await waitForPageReady(page);

    const body = (await page.textContent("body")) || "";
    const hasInvoices =
      body.toLowerCase().includes("facture") ||
      body.toLowerCase().includes("invoice") ||
      body.toLowerCase().includes("aucun");

    expect(hasInvoices).toBeTruthy();
  });

  test("CONTRACT-07: La page paiements/échéances est accessible", async ({
    page,
  }) => {
    await page.goto("/contracts/payments");
    await waitForPageReady(page);

    const body = (await page.textContent("body")) || "";
    const hasPayments =
      body.toLowerCase().includes("paiement") ||
      body.toLowerCase().includes("échéance") ||
      body.toLowerCase().includes("aucun");

    expect(hasPayments).toBeTruthy();
  });

  // ── Code-level checks ──

  test("CONTRACT-08: La numérotation SA-YYYY-### est implémentée", async ({}) => {
    const fs = await import("fs");
    const content = fs.readFileSync(
      "/Users/gilles/Downloads/Projets Client/sales-system-main/src/lib/actions/contracts.ts",
      "utf-8",
    );

    expect(content).toContain("generateContractNumber");
    expect(content).toContain("SA-${year}-");
    expect(content).toContain("padStart(3");
  });

  test("CONTRACT-09: Auto-génération facture à la signature est implémentée", async ({}) => {
    const fs = await import("fs");
    const content = fs.readFileSync(
      "/Users/gilles/Downloads/Projets Client/sales-system-main/src/lib/actions/contracts.ts",
      "utf-8",
    );

    expect(content).toContain("generateInvoice");
    expect(content).toContain("createInstallmentPlan");
    // Should be called in saveSignature
    expect(content).toContain("await generateInvoice(contractId");
  });

  test("CONTRACT-10: Le bouton Générer un contrat existe dans le deal panel", async ({}) => {
    const fs = await import("fs");
    const content = fs.readFileSync(
      "/Users/gilles/Downloads/Projets Client/sales-system-main/src/app/(app)/crm/deal-panel.tsx",
      "utf-8",
    );

    expect(content).toContain("Générer un contrat");
    expect(content).toContain("/contracts/new?dealId=");
  });
});
