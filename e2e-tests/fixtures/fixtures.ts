import { test as base, type Page } from "@playwright/test";
import { TEST_USERS, type TestUser } from "../helpers/test-users";
import path from "path";

const AUTH_DIR = path.resolve(__dirname, "../.auth");

/**
 * Crée une fixture Playwright pré-authentifiée pour un rôle donné.
 * Usage dans les tests :
 *   import { test } from "../fixtures/fixtures";
 *   test("mon test", async ({ setterPage, b2bPage }) => { ... });
 */
type AuthFixtures = {
  adminPage: Page;
  managerPage: Page;
  setterPage: Page;
  closerPage: Page;
  b2bPage: Page;
  b2cPage: Page;
};

async function createAuthenticatedPage(
  browser: ReturnType<(typeof base)["extend"]> extends infer T ? T : never,
  userKey: string,
): Promise<Page> {
  const user = TEST_USERS[userKey];
  if (!user) throw new Error(`Unknown user key: ${userKey}`);

  const storagePath = path.resolve(AUTH_DIR, `${userKey}.json`);
  const context = await (browser as any)._browser.newContext({
    storageState: storagePath,
  });
  return context.newPage();
}

export const test = base.extend<AuthFixtures>({
  adminPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: path.resolve(AUTH_DIR, "admin.json"),
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },

  managerPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: path.resolve(AUTH_DIR, "manager.json"),
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },

  setterPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: path.resolve(AUTH_DIR, "setter1.json"),
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },

  closerPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: path.resolve(AUTH_DIR, "closer.json"),
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },

  b2bPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: path.resolve(AUTH_DIR, "b2b1.json"),
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },

  b2cPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: path.resolve(AUTH_DIR, "b2c1.json"),
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
});

export { expect } from "@playwright/test";
export type { TestUser };
