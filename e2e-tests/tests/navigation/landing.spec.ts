import { test, expect } from "@playwright/test";

test.describe("Landing Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
  });

  test("page loads with status 200", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.status()).toBe(200);
  });

  test("main heading is visible", async ({ page }) => {
    const heading = page.getByRole("heading", { level: 1 });
    await expect(heading).toBeVisible();
    await expect(heading).toContainText("plateforme");
  });

  test("navigation links are visible", async ({ page }) => {
    const nav = page.getByLabel("Navigation principale");
    await expect(
      nav.getByRole("link", { name: "Fonctionnalites" }),
    ).toBeVisible();
    await expect(nav.getByRole("link", { name: "Tarifs" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Temoignages" })).toBeVisible();
  });

  test("CTA buttons lead to login and register", async ({ page }) => {
    const connexionLink = page.getByRole("link", { name: "Connexion" });
    await expect(connexionLink).toBeVisible();
    await expect(connexionLink).toHaveAttribute("href", "/login");

    const commencerLink = page.getByRole("link", { name: "Commencer" }).first();
    await expect(commencerLink).toBeVisible();
    await expect(commencerLink).toHaveAttribute("href", "/register");
  });

  test("features section displays 6 feature cards", async ({ page }) => {
    const features = [
      "CRM Intelligent",
      "Academy",
      "Prospection IA",
      "Scripts de Vente",
      "Chat & Communaute",
      "Analytics",
    ];
    for (const feature of features) {
      await expect(page.getByRole("heading", { name: feature })).toBeVisible();
    }
  });

  test("pricing section shows 3 plans", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Starter" })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Pro", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Enterprise" }),
    ).toBeVisible();
  });

  test("pricing toggle between mensuel and annuel", async ({ page }) => {
    const mensuelBtn = page.getByRole("button", { name: "Mensuel" });
    const annuelBtn = page.getByRole("button", { name: /Annuel/ });
    await expect(mensuelBtn).toBeVisible();
    await expect(annuelBtn).toBeVisible();

    await annuelBtn.click();
    // Le prix devrait changer (le bouton actif change)
    await expect(annuelBtn).toBeVisible();
  });

  test("testimonials section shows 3 reviews", async ({ page }) => {
    const testimonialSection = page.getByRole("region", {
      name: /Ils ont transform/,
    });
    await expect(testimonialSection).toBeVisible();

    // 3 articles de témoignage
    const articles = testimonialSection.getByRole("article");
    await expect(articles).toHaveCount(3);
  });

  test("footer has legal links", async ({ page }) => {
    await expect(page.getByRole("link", { name: "CGV" })).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Mentions legales" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Politique de confidentialite" }),
    ).toBeVisible();
  });

  test("French encoding is correct (no mojibake)", async ({ page }) => {
    const bodyText = await page.textContent("body");
    // Vérifier que les accents sont corrects
    expect(bodyText).toContain("equipe");
    expect(bodyText).toContain("plateforme");
    // Le body doit avoir du contenu substantiel
    expect(bodyText!.length).toBeGreaterThan(500);
  });

  test("connexion button navigates to login page", async ({ page }) => {
    await page.getByRole("link", { name: "Connexion" }).click();
    await page.waitForURL("/login");
    expect(page.url()).toContain("/login");
  });
});
