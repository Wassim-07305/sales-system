const $ = (id: string) => document.getElementById(id);

async function loadStatus(): Promise<void> {
  chrome.runtime.sendMessage({ action: "get_status" }, (response) => {
    if (!response) return;

    const { auth, linkedin, sync } = response;

    if (!auth?.isAuthenticated) {
      $("login-section")?.classList.remove("hidden");
      $("status-section")?.classList.add("hidden");
      return;
    }

    $("login-section")?.classList.add("hidden");
    $("status-section")?.classList.remove("hidden");

    const liDot = $("li-dot");
    const liStatus = $("li-status");
    if (linkedin?.isLoggedIn) {
      liDot?.classList.add("dot-green");
      liDot?.classList.remove("dot-red");
      if (liStatus) liStatus.textContent = "LinkedIn connecte";
    } else {
      liDot?.classList.add("dot-red");
      liDot?.classList.remove("dot-green");
      if (liStatus) liStatus.textContent = "Ouvre LinkedIn pour activer";
    }

    const prospectsCount = $("prospects-count");
    if (prospectsCount) prospectsCount.textContent = String(sync?.prospectsSynced || 0);

    const conversationsCount = $("conversations-count");
    if (conversationsCount) conversationsCount.textContent = String(sync?.conversationsSynced || 0);

    const lastSync = $("last-sync");
    if (lastSync) {
      lastSync.textContent = sync?.lastSyncAt
        ? "Derniere sync : " + new Date(sync.lastSyncAt).toLocaleTimeString("fr-FR")
        : "Pas encore synchronise";
    }
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

  chrome.runtime.sendMessage({ action: "force_sync" }, () => {
    btn.disabled = false;
    btn.textContent = "Synchroniser maintenant";
    loadStatus();
  });
});

$("logout-btn")?.addEventListener("click", () => {
  chrome.runtime.sendMessage({ action: "logout" }, () => {
    loadStatus();
  });
});

loadStatus();
