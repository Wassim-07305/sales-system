import type { SyncState, AuthState, LinkedInAuth } from "../shared/types";
import { SYNC_INTERVAL_MINUTES } from "../shared/constants";

const $ = (id: string) => document.getElementById(id);

function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function getNextSyncText(lastSyncAt: string | null): string {
  if (!lastSyncAt) return "";
  const nextSync = new Date(new Date(lastSyncAt).getTime() + SYNC_INTERVAL_MINUTES * 60 * 1000);
  const now = new Date();
  const diffMs = nextSync.getTime() - now.getTime();

  if (diffMs <= 0) return "Prochaine sync : imminente";

  const diffSec = Math.round(diffMs / 1000);
  if (diffSec < 60) return "Prochaine sync : dans " + diffSec + "s";

  const diffMin = Math.round(diffSec / 60);
  return "Prochaine sync : dans " + diffMin + " min";
}

function updateSyncStatusIndicator(sync: SyncState): void {
  const dot = $("sync-dot");
  const text = $("sync-status-text");
  const errorEl = $("sync-error");

  if (!dot || !text || !errorEl) return;

  if (sync.syncStatus === "syncing") {
    dot.className = "dot dot-amber";
    text.textContent = "Synchronisation en cours...";
    errorEl.classList.add("hidden");
  } else if (sync.syncStatus === "error") {
    dot.className = "dot dot-red";
    text.textContent = "Erreur de synchronisation";
    if (sync.error) {
      errorEl.textContent = sync.error;
      errorEl.classList.remove("hidden");
    }
  } else {
    dot.className = "dot dot-green";
    text.textContent = "Sync OK";
    errorEl.classList.add("hidden");
  }
}

function renderStatus(auth: AuthState, linkedin: LinkedInAuth, sync: SyncState): void {
  if (!auth?.isAuthenticated) {
    $("login-section")?.classList.remove("hidden");
    $("status-section")?.classList.add("hidden");
    return;
  }

  $("login-section")?.classList.add("hidden");
  $("status-section")?.classList.remove("hidden");

  // LinkedIn status
  const liDot = $("li-dot");
  const liStatus = $("li-status");
  if (linkedin?.isLoggedIn) {
    liDot?.classList.add("dot-green");
    liDot?.classList.remove("dot-red");
    if (liStatus) liStatus.textContent = "LinkedIn connecté";
  } else {
    liDot?.classList.add("dot-red");
    liDot?.classList.remove("dot-green");
    if (liStatus) liStatus.textContent = "Ouvre LinkedIn pour activer";
  }

  // Stats
  const prospectsCount = $("prospects-count");
  if (prospectsCount) prospectsCount.textContent = String(sync?.prospectsSynced || 0);

  const conversationsCount = $("conversations-count");
  if (conversationsCount) conversationsCount.textContent = String(sync?.conversationsSynced || 0);

  // Last sync
  const lastSync = $("last-sync");
  if (lastSync) {
    lastSync.textContent = sync?.lastSyncAt
      ? "Dernière sync : " + formatTime(sync.lastSyncAt)
      : "Pas encore synchronisé";
  }

  // Next sync
  const nextSync = $("next-sync");
  if (nextSync) {
    nextSync.textContent = getNextSyncText(sync?.lastSyncAt ?? null);
  }

  // Sync status indicator
  updateSyncStatusIndicator(sync || { syncStatus: "idle", lastSyncAt: null, conversationsSynced: 0, prospectsSynced: 0, error: null });
}

async function loadStatus(): Promise<void> {
  chrome.runtime.sendMessage({ action: "get_status" }, (response) => {
    if (!response) return;
    const { auth, linkedin, sync } = response;
    renderStatus(auth, linkedin, sync);
  });
}

$("login-btn")?.addEventListener("click", () => {
  const email = ($("email") as HTMLInputElement).value;
  const password = ($("password") as HTMLInputElement).value;
  const errorEl = $("login-error");
  const btn = $("login-btn") as HTMLButtonElement;

  if (!email || !password) {
    if (errorEl) {
      errorEl.textContent = "Email et mot de passe requis";
      errorEl.classList.remove("hidden");
    }
    return;
  }

  btn.disabled = true;
  btn.textContent = "Connexion...";

  chrome.runtime.sendMessage(
    { action: "login", email, password },
    (response) => {
      btn.disabled = false;
      btn.textContent = "Se connecter";

      if (response?.success) {
        loadStatus();
      } else {
        if (errorEl) {
          errorEl.textContent = response?.error || "Erreur de connexion";
          errorEl.classList.remove("hidden");
        }
      }
    }
  );
});

$("sync-btn")?.addEventListener("click", () => {
  const btn = $("sync-btn") as HTMLButtonElement;
  btn.disabled = true;
  btn.textContent = "Sync en cours...";

  // Afficher l'état syncing immédiatement
  const syncDot = $("sync-dot");
  const syncText = $("sync-status-text");
  if (syncDot) syncDot.className = "dot dot-amber";
  if (syncText) syncText.textContent = "Synchronisation en cours...";

  chrome.runtime.sendMessage({ action: "force_sync" }, (response) => {
    btn.disabled = false;
    btn.textContent = "Synchroniser maintenant";
    if (response?.sync) {
      const { sync } = response;
      const prospectsCount = $("prospects-count");
      if (prospectsCount) prospectsCount.textContent = String(sync.prospectsSynced || 0);
      const conversationsCount = $("conversations-count");
      if (conversationsCount) conversationsCount.textContent = String(sync.conversationsSynced || 0);
      const lastSync = $("last-sync");
      if (lastSync) {
        lastSync.textContent = sync.lastSyncAt
          ? "Dernière sync : " + formatTime(sync.lastSyncAt)
          : "Pas encore synchronisé";
      }
      const nextSync = $("next-sync");
      if (nextSync) nextSync.textContent = getNextSyncText(sync.lastSyncAt);
      updateSyncStatusIndicator(sync);
    }
  });
});

$("logout-btn")?.addEventListener("click", () => {
  chrome.runtime.sendMessage({ action: "logout" }, () => {
    loadStatus();
  });
});

loadStatus();

// Rafraîchit automatiquement toutes les 30s pour mettre à jour le temps restant
setInterval(loadStatus, 30_000);
