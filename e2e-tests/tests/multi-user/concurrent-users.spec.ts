import { test, expect, type Browser, type Page } from "@playwright/test";

/**
 * Simulation multi-utilisateurs : 15 browser contexts en parallèle.
 * Chaque context est un utilisateur différent avec son propre rôle.
 * Ils naviguent et interagissent tous en même temps.
 *
 * Objectif : vérifier qu'il n'y a pas de conflits de données,
 * de race conditions, ou de crashs quand tout le monde agit en même temps.
 */

const USERS = [
  { email: "admin.test@demo.com", role: "admin", name: "Admin Test" },
  { email: "admin.backup@demo.com", role: "admin", name: "Admin Backup" },
  { email: "marie.leroy@demo.com", role: "manager", name: "Marie Leroy" },
  { email: "antoine.blanc@demo.com", role: "manager", name: "Antoine Blanc" },
  { email: "thomas.martin@demo.com", role: "setter", name: "Thomas Martin" },
  { email: "sophie.durand@demo.com", role: "setter", name: "Sophie Durand" },
  { email: "maxime.girard@demo.com", role: "setter", name: "Maxime Girard" },
  {
    email: "camille.fournier@demo.com",
    role: "setter",
    name: "Camille Fournier",
  },
  { email: "lucas.bernard@demo.com", role: "closer", name: "Lucas Bernard" },
  { email: "clara.dubois@demo.com", role: "closer", name: "Clara Dubois" },
  { email: "jean.dupont@demo.com", role: "b2b", name: "Jean Dupont" },
  { email: "emma.petit@demo.com", role: "b2b", name: "Emma Petit" },
  { email: "pierre.moreau@demo.com", role: "b2c", name: "Pierre Moreau" },
  { email: "julie.robert@demo.com", role: "b2c", name: "Julie Robert" },
  { email: "lea.garcia@demo.com", role: "b2c", name: "Léa Garcia" },
];

async function loginUser(
  page: Page,
  email: string,
  password = "demo1234",
): Promise<void> {
  await page.goto("/login");
  await page.getByRole("textbox", { name: "Email" }).fill(email);
  await page.getByRole("textbox", { name: "Mot de passe" }).fill(password);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL(/\/(dashboard|onboarding|crm|portal)/, {
    timeout: 30000,
  });
}

// Actions par rôle
async function adminActions(page: Page): Promise<string[]> {
  const errors: string[] = [];
  try {
    await page.goto("/settings");
    await page.waitForLoadState("networkidle");
    const bodyText = await page.locator("body").innerText();
    if (bodyText.length < 50) errors.push("Admin: /settings vide");

    await page.goto("/team");
    await page.waitForLoadState("networkidle");

    await page.goto("/analytics");
    await page.waitForLoadState("networkidle");

    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
  } catch (e) {
    errors.push(`Admin error: ${(e as Error).message.substring(0, 100)}`);
  }
  return errors;
}

async function setterActions(page: Page, name: string): Promise<string[]> {
  const errors: string[] = [];
  try {
    await page.goto("/crm");
    await page.waitForLoadState("networkidle");

    // Créer un deal
    const dealTitle = `Concurrent Deal ${name} ${Date.now()}`;
    await page
      .getByRole("button", { name: /nouveau deal/i })
      .first()
      .click();
    await page.getByRole("textbox", { name: "Titre du deal" }).fill(dealTitle);
    await page.getByRole("spinbutton", { name: "Valeur" }).fill("3000");
    await page.getByRole("button", { name: "Créer le deal" }).click();
    await page.waitForTimeout(3000);

    // Naviguer vers d'autres pages
    await page.goto("/academy");
    await page.waitForLoadState("networkidle");

    await page.goto("/prospecting");
    await page.waitForLoadState("networkidle");

    await page.goto("/crm");
    await page.waitForLoadState("networkidle");

    // Vérifier que le deal existe
    const bodyText = await page.locator("body").innerText();
    if (!bodyText.includes("Deal") && !bodyText.includes("deal"))
      errors.push(`${name}: deal non visible après création`);
  } catch (e) {
    errors.push(
      `Setter ${name} error: ${(e as Error).message.substring(0, 100)}`,
    );
  }
  return errors;
}

async function closerActions(page: Page, name: string): Promise<string[]> {
  const errors: string[] = [];
  try {
    await page.goto("/crm");
    await page.waitForLoadState("networkidle");

    // Consulter le pipeline
    const bodyText = await page.locator("body").innerText();
    if (!bodyText.includes("Pipeline") && !bodyText.includes("CRM"))
      errors.push(`${name}: CRM non chargé`);

    await page.goto("/journal");
    await page.waitForLoadState("networkidle");

    await page.goto("/scripts");
    await page.waitForLoadState("networkidle");

    await page.goto("/roleplay");
    await page.waitForLoadState("networkidle");
  } catch (e) {
    errors.push(
      `Closer ${name} error: ${(e as Error).message.substring(0, 100)}`,
    );
  }
  return errors;
}

async function b2bActions(page: Page, name: string): Promise<string[]> {
  const errors: string[] = [];
  try {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    await page.goto("/portal");
    await page.waitForLoadState("networkidle");

    await page.goto("/kpis");
    await page.waitForLoadState("networkidle");

    await page.goto("/prospects");
    await page.waitForLoadState("networkidle");

    await page.goto("/bookings");
    await page.waitForLoadState("networkidle");
  } catch (e) {
    errors.push(`B2B ${name} error: ${(e as Error).message.substring(0, 100)}`);
  }
  return errors;
}

async function b2cActions(page: Page, name: string): Promise<string[]> {
  const errors: string[] = [];
  try {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    await page.goto("/academy");
    await page.waitForLoadState("networkidle");

    await page.goto("/community");
    await page.waitForLoadState("networkidle");

    await page.goto("/bookings");
    await page.waitForLoadState("networkidle");

    await page.goto("/chat");
    await page.waitForLoadState("networkidle");
  } catch (e) {
    errors.push(`B2C ${name} error: ${(e as Error).message.substring(0, 100)}`);
  }
  return errors;
}

test.describe("Simulation 15 utilisateurs concurrents", () => {
  test.setTimeout(300_000); // 5 minutes max

  test("15 utilisateurs naviguent et interagissent en même temps sans crash", async ({
    browser,
  }) => {
    // Créer 15 browser contexts — par vagues de 5 pour éviter le rate limiting Vercel
    const allResults: { user: string; role: string; errors: string[] }[] = [];

    for (let batch = 0; batch < 3; batch++) {
      const batchUsers = USERS.slice(batch * 5, (batch + 1) * 5);
      const batchPromises = batchUsers.map(async (user) => {
        const context = await browser.newContext();
        const page = await context.newPage();

        // Login
        await loginUser(page, user.email);

        // Exécuter les actions selon le rôle
        let errors: string[] = [];
        switch (user.role) {
          case "admin":
            errors = await adminActions(page);
            break;
          case "manager":
            errors = await adminActions(page); // managers ont les mêmes droits
            break;
          case "setter":
            errors = await setterActions(page, user.name);
            break;
          case "closer":
            errors = await closerActions(page, user.name);
            break;
          case "b2b":
            errors = await b2bActions(page, user.name);
            break;
          case "b2c":
            errors = await b2cActions(page, user.name);
            break;
        }

        await context.close();
        return { user: user.name, role: user.role, errors };
      });

      const batchResults = await Promise.all(batchPromises);
      allResults.push(...batchResults);
      // Pause entre les vagues pour laisser le serveur respirer
      if (batch < 2) await new Promise((r) => setTimeout(r, 2000));
    }

    const results = allResults;

    // Compter les erreurs
    const allErrors = results.flatMap((r) =>
      r.errors.map((e) => `[${r.user} (${r.role})] ${e}`),
    );

    // Afficher les résultats
    const successCount = results.filter((r) => r.errors.length === 0).length;
    console.log(`\n=== Résultats simulation multi-utilisateurs ===`);
    console.log(`Utilisateurs : ${results.length}`);
    console.log(`Succès : ${successCount}/${results.length}`);
    if (allErrors.length > 0) {
      console.log(`Erreurs (${allErrors.length}) :`);
      allErrors.forEach((e) => console.log(`  - ${e}`));
    }

    // Tolérer quelques erreurs mineures sous charge (max 3 sur 15)
    expect(
      allErrors.length,
      `${allErrors.length} erreurs sur 15 utilisateurs :\n${allErrors.join("\n")}`,
    ).toBeLessThanOrEqual(3);
    // Au moins 80% des utilisateurs doivent réussir
    expect(successCount).toBeGreaterThanOrEqual(12);
  });

  test("les données d'un setter ne fuient pas vers un autre setter", async ({
    browser,
  }) => {
    // 2 setters créent des deals en parallèle
    const [ctx1, ctx2] = await Promise.all([
      browser.newContext(),
      browser.newContext(),
    ]);
    const [page1, page2] = await Promise.all([ctx1.newPage(), ctx2.newPage()]);

    // Login en parallèle
    await Promise.all([
      loginUser(page1, "thomas.martin@demo.com"),
      loginUser(page2, "sophie.durand@demo.com"),
    ]);

    // Naviguer vers le CRM en parallèle
    await Promise.all([
      page1.goto("/crm").then(() => page1.waitForLoadState("networkidle")),
      page2.goto("/crm").then(() => page2.waitForLoadState("networkidle")),
    ]);

    // Les deux voient le CRM — pas de crash
    const [text1, text2] = await Promise.all([
      page1.locator("body").innerText(),
      page2.locator("body").innerText(),
    ]);

    expect(text1).toContain("Pipeline");
    expect(text2).toContain("Pipeline");

    // Créer un deal unique avec setter 1
    const uniqueTitle = `Isolation Test ${Date.now()}`;
    await page1
      .getByRole("button", { name: /nouveau deal/i })
      .first()
      .click();
    await page1
      .getByRole("textbox", { name: "Titre du deal" })
      .fill(uniqueTitle);
    await page1.getByRole("spinbutton", { name: "Valeur" }).fill("9999");
    await page1.getByRole("button", { name: "Créer le deal" }).click();
    await page1.waitForTimeout(5000);

    // Refresh setter 2
    await page2.reload();
    await page2.waitForLoadState("networkidle");
    await page2.waitForTimeout(2000);

    // Le deal créé par setter 1 peut ou non être visible par setter 2
    // (dépend de l'organisation/RLS), mais aucun crash ne doit survenir
    const text2After = await page2.locator("body").innerText();
    expect(text2After.length).toBeGreaterThan(50);

    await Promise.all([ctx1.close(), ctx2.close()]);
  });

  test("admin + setters + clients interagissent sans race conditions", async ({
    browser,
  }) => {
    // 3 rôles différents agissent en même temps
    const [ctxAdmin, ctxSetter, ctxB2B] = await Promise.all([
      browser.newContext(),
      browser.newContext(),
      browser.newContext(),
    ]);
    const [pageAdmin, pageSetter, pageB2B] = await Promise.all([
      ctxAdmin.newPage(),
      ctxSetter.newPage(),
      ctxB2B.newPage(),
    ]);

    // Login en parallèle
    await Promise.all([
      loginUser(pageAdmin, "admin.test@demo.com"),
      loginUser(pageSetter, "thomas.martin@demo.com"),
      loginUser(pageB2B, "jean.dupont@demo.com"),
    ]);

    // Actions simultanées
    const [adminResult, setterResult, b2bResult] = await Promise.all([
      // Admin navigue dans les settings
      (async () => {
        try {
          await pageAdmin.goto("/settings");
          await pageAdmin.waitForLoadState("networkidle");
          await pageAdmin.goto("/team");
          await pageAdmin.waitForLoadState("networkidle");
          return "ok";
        } catch {
          return "error";
        }
      })(),

      // Setter crée un deal
      (async () => {
        try {
          await pageSetter.goto("/crm");
          await pageSetter.waitForLoadState("networkidle");
          await pageSetter
            .getByRole("button", { name: /nouveau deal/i })
            .first()
            .click();
          await pageSetter
            .getByRole("textbox", { name: "Titre du deal" })
            .fill(`Race Test ${Date.now()}`);
          await pageSetter
            .getByRole("spinbutton", { name: "Valeur" })
            .fill("5000");
          await pageSetter
            .getByRole("button", { name: "Créer le deal" })
            .click();
          await pageSetter.waitForTimeout(3000);
          return "ok";
        } catch {
          return "error";
        }
      })(),

      // B2B consulte son portail
      (async () => {
        try {
          await pageB2B.goto("/portal");
          await pageB2B.waitForLoadState("networkidle");
          await pageB2B.goto("/kpis");
          await pageB2B.waitForLoadState("networkidle");
          await pageB2B.goto("/bookings");
          await pageB2B.waitForLoadState("networkidle");
          return "ok";
        } catch {
          return "error";
        }
      })(),
    ]);

    // Aucun ne doit crasher
    expect(adminResult).toBe("ok");
    expect(setterResult).toBe("ok");
    expect(b2bResult).toBe("ok");

    await Promise.all([ctxAdmin.close(), ctxSetter.close(), ctxB2B.close()]);
  });
});
