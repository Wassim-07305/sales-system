export function createFloatingPanel(): void {
  if (document.getElementById("ss-floating-panel")) return;

  const panel = document.createElement("div");
  panel.id = "ss-floating-panel";

  // Header
  const header = document.createElement("div");
  header.className = "ss-panel-header";

  const icon = document.createElement("img");
  icon.src = chrome.runtime.getURL("icons/logo.png");
  icon.width = 20;
  icon.height = 20;
  header.appendChild(icon);

  const title = document.createElement("span");
  title.textContent = "Sales System";
  header.appendChild(title);

  const toggleBtn = document.createElement("button");
  toggleBtn.id = "ss-panel-toggle";
  toggleBtn.className = "ss-panel-close";
  toggleBtn.textContent = "\u00d7";
  header.appendChild(toggleBtn);

  panel.appendChild(header);

  // Body
  const body = document.createElement("div");
  body.className = "ss-panel-body";
  body.id = "ss-panel-body";

  const status = document.createElement("div");
  status.className = "ss-panel-status";
  status.id = "ss-panel-status";
  status.textContent = "Chargement...";
  body.appendChild(status);

  panel.appendChild(body);
  document.body.appendChild(panel);

  toggleBtn.addEventListener("click", () => {
    panel.classList.toggle("ss-panel-collapsed");
  });

  // Load status
  chrome.runtime.sendMessage({ action: "get_status" }, (response) => {
    if (!response) return;

    const auth = response.auth;
    const sync = response.sync;

    if (!auth?.isAuthenticated) {
      status.textContent = "Non connecte a Sales System";
      status.className = "ss-panel-status ss-text-muted";
      return;
    }

    // Clear and rebuild status
    while (status.firstChild) status.removeChild(status.firstChild);

    const row1 = document.createElement("div");
    row1.className = "ss-status-row";
    const dot = document.createElement("span");
    dot.className = "ss-dot ss-dot-green";
    row1.appendChild(dot);
    const text1 = document.createTextNode(" Connecte");
    row1.appendChild(text1);
    status.appendChild(row1);

    const row2 = document.createElement("div");
    row2.className = "ss-status-row ss-text-muted";
    row2.textContent = (sync?.conversationsSynced || 0) + " conversations synchro";
    status.appendChild(row2);

    const row3 = document.createElement("div");
    row3.className = "ss-status-row ss-text-muted";
    row3.textContent = "Derniere sync : " + (sync?.lastSyncAt ? new Date(sync.lastSyncAt).toLocaleTimeString("fr-FR") : "jamais");
    status.appendChild(row3);

    const syncBtn = document.createElement("button");
    syncBtn.id = "ss-force-sync";
    syncBtn.className = "ss-btn";
    syncBtn.textContent = "Synchroniser";
    status.appendChild(syncBtn);

    syncBtn.addEventListener("click", () => {
      chrome.runtime.sendMessage({ action: "force_sync" });
      syncBtn.textContent = "Sync en cours...";
      syncBtn.disabled = true;
    });
  });
}
