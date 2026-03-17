import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import path from "path";

// Charger les env vars du projet parent
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const BASE_URL = process.env.E2E_BASE_URL || "http://localhost:3000";

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.ts",

  /* Timeout global par test : 60s (certaines pages sont lentes) */
  timeout: 60_000,
  expect: { timeout: 15_000 },

  /* Parallélisme : chaque test est indépendant */
  fullyParallel: true,
  workers: process.env.CI ? 4 : 15,
  retries: process.env.CI ? 2 : 0,

  /* Reporter : HTML pour le debug, list pour la CI */
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "test-report" }],
    ["json", { outputFile: "test-results/results.json" }],
  ],

  /* Options globales */
  use: {
    baseURL: BASE_URL,
    headless: true,

    /* Captures en cas d'échec */
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    trace: "retain-on-failure",

    /* Timeouts réseau */
    actionTimeout: 15_000,
    navigationTimeout: 30_000,

    /* Locale FR */
    locale: "fr-FR",
    timezoneId: "Europe/Paris",
  },

  /* Projets : un par navigateur */
  projects: [
    /* Setup : authentifier chaque rôle et sauvegarder le storageState */
    {
      name: "auth-setup",
      testDir: "./fixtures",
      testMatch: "auth-setup.ts",
    },

    /* Tests principaux sur Chromium */
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["auth-setup"],
    },

    /* Tests mobile (responsive) */
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 7"] },
      dependencies: ["auth-setup"],
      testMatch: "**/navigation/**",
    },
  ],

  /* Lancer le serveur Next.js automatiquement */
  webServer: {
    command: "npm run dev",
    cwd: path.resolve(__dirname, ".."),
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
