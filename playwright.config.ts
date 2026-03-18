import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e-audit",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "https://sales-system-six.vercel.app",
    headless: true,
    screenshot: "only-on-failure",
    trace: "on-first-retry",
    viewport: { width: 1440, height: 900 },
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
});
