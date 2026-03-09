export function injectProfileBadge(inCrm: boolean): void {
  const existing = document.getElementById("ss-linkedin-badge");
  if (existing) existing.remove();

  const badge = document.createElement("div");
  badge.id = "ss-linkedin-badge";

  if (inCrm) {
    const span = document.createElement("span");
    span.className = "ss-badge ss-badge-green";
    span.textContent = "\u2713 Dans Sales System";
    badge.appendChild(span);
  } else {
    const span = document.createElement("span");
    span.className = "ss-badge ss-badge-gray";
    const btn = document.createElement("button");
    btn.id = "ss-import-btn";
    btn.textContent = "+ Importer dans Sales System";
    span.appendChild(btn);
    badge.appendChild(span);
  }

  const nameSection = document.querySelector(".pv-text-details__left-panel") ||
    document.querySelector("[data-generated-suggestion-target]")?.parentElement;

  if (nameSection) {
    nameSection.appendChild(badge);
  }

  const importBtn = document.getElementById("ss-import-btn");
  if (importBtn) {
    importBtn.addEventListener("click", () => {
      const slug = extractSlugFromUrl(window.location.href);
      if (slug) {
        chrome.runtime.sendMessage({ action: "scrape_profile", slug });
        const parent = importBtn.parentElement;
        if (parent) {
          parent.className = "ss-badge ss-badge-green";
          parent.textContent = "\u2713 Import en cours...";
        }
      }
    });
  }
}

export function extractSlugFromUrl(url: string): string | null {
  const match = url.match(/linkedin\.com\/in\/([^/]+)/);
  return match ? match[1] : null;
}
