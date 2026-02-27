import type { AuthState, LinkedInAuth, SyncState } from "./types";
import { STORAGE_KEYS, RATE_LIMIT } from "./constants";

export async function getAuth(): Promise<AuthState> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.auth);
  return result[STORAGE_KEYS.auth] || {
    supabaseUrl: null,
    supabaseAnonKey: null,
    accessToken: null,
    refreshToken: null,
    userId: null,
    isAuthenticated: false,
  };
}

export async function setAuth(auth: AuthState): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.auth]: auth });
}

export async function getLinkedInAuth(): Promise<LinkedInAuth> {
  const result = await chrome.storage.session.get(STORAGE_KEYS.linkedinAuth);
  return result[STORAGE_KEYS.linkedinAuth] || {
    csrfToken: null,
    isLoggedIn: false,
  };
}

export async function setLinkedInAuth(auth: LinkedInAuth): Promise<void> {
  await chrome.storage.session.set({ [STORAGE_KEYS.linkedinAuth]: auth });
}

export async function getSyncState(): Promise<SyncState> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.syncState);
  return result[STORAGE_KEYS.syncState] || {
    lastSyncAt: null,
    syncStatus: "idle",
    conversationsSynced: 0,
    prospectsSynced: 0,
    error: null,
  };
}

export async function setSyncState(state: Partial<SyncState>): Promise<void> {
  const current = await getSyncState();
  await chrome.storage.local.set({
    [STORAGE_KEYS.syncState]: { ...current, ...state },
  });
}

export async function canMakeApiCall(): Promise<boolean> {
  const key = STORAGE_KEYS.rateLimitCalls;
  const result = await chrome.storage.local.get(key);
  const calls: number[] = result[key] || [];
  const oneHourAgo = Date.now() - 3600000;
  const recentCalls = calls.filter((t: number) => t > oneHourAgo);
  return recentCalls.length < RATE_LIMIT.maxCallsPerHour;
}

export async function recordApiCall(): Promise<void> {
  const key = STORAGE_KEYS.rateLimitCalls;
  const result = await chrome.storage.local.get(key);
  const calls: number[] = result[key] || [];
  const oneHourAgo = Date.now() - 3600000;
  const recentCalls = calls.filter((t: number) => t > oneHourAgo);
  recentCalls.push(Date.now());
  await chrome.storage.local.set({ [key]: recentCalls });
}

export async function randomDelay(): Promise<void> {
  const ms = RATE_LIMIT.minDelayMs + Math.random() * (RATE_LIMIT.maxDelayMs - RATE_LIMIT.minDelayMs);
  return new Promise((resolve) => setTimeout(resolve, ms));
}
