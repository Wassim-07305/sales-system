/**
 * Définition des utilisateurs de test — mapping rôle → credentials
 * Tous les utilisateurs demo ont le mot de passe "demo1234"
 */

export interface TestUser {
  email: string;
  password: string;
  fullName: string;
  role: "admin" | "manager" | "setter" | "closer" | "client_b2b" | "client_b2c";
  storageStatePath: string;
}

const PASSWORD = "demo1234";

export const TEST_USERS: Record<string, TestUser> = {
  // Admin (à créer via seed)
  admin: {
    email: "admin.test@demo.com",
    password: PASSWORD,
    fullName: "Admin Test",
    role: "admin",
    storageStatePath: ".auth/admin.json",
  },

  // Manager
  manager: {
    email: "marie.leroy@demo.com",
    password: PASSWORD,
    fullName: "Marie Leroy",
    role: "manager",
    storageStatePath: ".auth/manager.json",
  },

  // Setters
  setter1: {
    email: "thomas.martin@demo.com",
    password: PASSWORD,
    fullName: "Thomas Martin",
    role: "setter",
    storageStatePath: ".auth/setter1.json",
  },
  setter2: {
    email: "sophie.durand@demo.com",
    password: PASSWORD,
    fullName: "Sophie Durand",
    role: "setter",
    storageStatePath: ".auth/setter2.json",
  },

  // Closer
  closer: {
    email: "lucas.bernard@demo.com",
    password: PASSWORD,
    fullName: "Lucas Bernard",
    role: "closer",
    storageStatePath: ".auth/closer.json",
  },

  // Clients B2B
  b2b1: {
    email: "jean.dupont@demo.com",
    password: PASSWORD,
    fullName: "Jean Dupont",
    role: "client_b2b",
    storageStatePath: ".auth/b2b1.json",
  },
  b2b2: {
    email: "emma.petit@demo.com",
    password: PASSWORD,
    fullName: "Emma Petit",
    role: "client_b2b",
    storageStatePath: ".auth/b2b2.json",
  },

  // Clients B2C
  b2c1: {
    email: "pierre.moreau@demo.com",
    password: PASSWORD,
    fullName: "Pierre Moreau",
    role: "client_b2c",
    storageStatePath: ".auth/b2c1.json",
  },
  b2c2: {
    email: "julie.robert@demo.com",
    password: PASSWORD,
    fullName: "Julie Robert",
    role: "client_b2c",
    storageStatePath: ".auth/b2c2.json",
  },
};

/**
 * Obtenir tous les users d'un rôle donné
 */
export function getUsersByRole(role: TestUser["role"]): TestUser[] {
  return Object.values(TEST_USERS).filter((u) => u.role === role);
}

/**
 * Obtenir un user par sa clé
 */
export function getUser(key: keyof typeof TEST_USERS): TestUser {
  return TEST_USERS[key];
}

/**
 * Routes accessibles par rôle
 */
export const ROUTES_BY_ROLE: Record<TestUser["role"], string[]> = {
  admin: [
    "/dashboard",
    "/crm",
    "/contacts",
    "/bookings",
    "/calendar",
    "/contracts",
    "/academy",
    "/team",
    "/team/assignments",
    "/analytics",
    "/prospecting",
    "/prospecting/discovery",
    "/roleplay",
    "/scripts",
    "/automation",
    "/community",
    "/chat",
    "/content",
    "/customers",
    "/marketplace",
    "/settings",
    "/settings/ai-modes",
    "/settings/onboarding",
    "/settings/white-label",
    "/settings/notifications",
    "/settings/privacy",
    "/settings/security",
    "/settings/custom-fields",
    "/settings/api",
    "/settings/integrations",
    "/help",
  ],
  manager: [
    "/dashboard",
    "/crm",
    "/contacts",
    "/bookings",
    "/calendar",
    "/contracts",
    "/academy",
    "/team",
    "/team/assignments",
    "/analytics",
    "/prospecting",
    "/prospecting/discovery",
    "/roleplay",
    "/scripts",
    "/automation",
    "/community",
    "/chat",
    "/content",
    "/customers",
    "/settings",
    "/settings/ai-modes",
    "/settings/onboarding",
    "/settings/white-label",
    "/settings/notifications",
    "/settings/privacy",
    "/settings/security",
    "/settings/custom-fields",
    "/settings/api",
    "/help",
  ],
  setter: [
    "/dashboard",
    "/crm",
    "/bookings",
    "/analytics/performance",
    "/journal",
    "/prospecting",
    "/prospecting/discovery",
    "/roleplay",
    "/scripts",
    "/academy",
    "/challenges",
    "/marketplace",
    "/chat",
    "/profile",
    "/help",
  ],
  closer: [
    "/dashboard",
    "/crm",
    "/bookings",
    "/analytics/performance",
    "/journal",
    "/prospecting",
    "/prospecting/discovery",
    "/roleplay",
    "/scripts",
    "/academy",
    "/challenges",
    "/marketplace",
    "/chat",
    "/profile",
    "/help",
  ],
  client_b2b: [
    "/dashboard",
    "/crm",
    "/bookings",
    "/portal",
    "/calls",
    "/resources",
    "/kpis",
    "/referral",
    "/prospects",
    "/settings-ia",
    "/ai-scripts",
    "/chat",
    "/profile",
    "/help",
  ],
  client_b2c: [
    "/dashboard",
    "/bookings",
    "/calls",
    "/resources",
    "/kpis",
    "/referral",
    "/prospects",
    "/ai-scripts",
    "/academy",
    "/community",
    "/chat",
    "/profile",
    "/help",
  ],
};

/**
 * Routes interdites par rôle (devrait rediriger vers /dashboard ou /login)
 */
export const FORBIDDEN_ROUTES: Record<TestUser["role"], string[]> = {
  admin: [], // Admin a accès à tout
  manager: ["/settings/integrations"],
  setter: [
    "/contacts",
    "/contracts",
    "/analytics",
    "/team",
    "/settings",
    "/automation",
    "/content",
    "/customers",
  ],
  closer: [
    "/contacts",
    "/contracts",
    "/analytics",
    "/team",
    "/settings",
    "/automation",
    "/content",
    "/customers",
  ],
  client_b2b: [
    "/contacts",
    "/contracts",
    "/analytics",
    "/team",
    "/settings",
    "/academy",
    "/community",
    "/automation",
  ],
  client_b2c: [
    "/contacts",
    "/contracts",
    "/analytics",
    "/team",
    "/settings",
    "/automation",
    "/crm",
    "/portal",
  ],
};
