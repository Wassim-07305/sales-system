import { injectProfileBadge, extractSlugFromUrl } from "./profile-badge";
import { createFloatingPanel } from "./panel";

createFloatingPanel();

// ---- Intercept real LinkedIn API calls ----
// Hook into both fetch() and XHR to capture:
// 1. Voyager headers LinkedIn uses (for reuse in our proxy calls)
// 2. Messaging-related URLs (to discover current endpoint patterns)
const capturedVoyagerHeaders: Record<string, string> = {};
const capturedApiUrls: string[] = [];

// --- Hook fetch() — capture ALL voyager API calls ---
const origFetch = window.fetch;
window.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
  const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

  // Capture ALL voyager API URLs (broad capture to discover endpoints)
  if (url.includes("/voyager/api/")) {
    // Extract just the path without query params for cleaner logging
    const path = url.split("?")[0].replace("https://www.linkedin.com/voyager/api/", "");
    capturedApiUrls.push(url);
    console.log("[SS-CAPTURE] fetch:", path);
    if (capturedApiUrls.length > 100) capturedApiUrls.shift();
  }

  // Capture headers from Voyager requests
  if (url.includes("/voyager/api/") && init?.headers) {
    const headers = init.headers instanceof Headers
      ? Object.fromEntries(init.headers.entries())
      : Array.isArray(init.headers)
        ? Object.fromEntries(init.headers)
        : init.headers as Record<string, string>;

    for (const [name, value] of Object.entries(headers)) {
      const lower = name.toLowerCase();
      if (
        lower === "x-li-track" ||
        lower === "x-li-page-instance" ||
        lower === "x-li-pem-metadata" ||
        lower === "accept" ||
        lower === "x-li-deco-include-micro-schema" ||
        lower === "csrf-token" ||
        lower === "x-restli-protocol-version"
      ) {
        capturedVoyagerHeaders[lower] = value;
      }
    }
  }

  return origFetch.apply(this, [input, init] as Parameters<typeof origFetch>);
};

// --- Hook XHR — capture ALL voyager API calls ---
const OrigXHR = window.XMLHttpRequest;
const origOpen = OrigXHR.prototype.open;
const origSetRequestHeader = OrigXHR.prototype.setRequestHeader;

OrigXHR.prototype.open = function (method: string, url: string | URL, ...rest: unknown[]) {
  (this as XMLHttpRequest & { _ssUrl?: string })._ssUrl = String(url);

  const urlStr = String(url);
  if (urlStr.includes("/voyager/api/")) {
    const path = urlStr.split("?")[0].replace("https://www.linkedin.com/voyager/api/", "");
    capturedApiUrls.push(urlStr);
    console.log("[SS-CAPTURE] XHR:", path);
    if (capturedApiUrls.length > 100) capturedApiUrls.shift();
  }

  return origOpen.apply(this, [method, url, ...rest] as Parameters<typeof origOpen>);
};

OrigXHR.prototype.setRequestHeader = function (name: string, value: string) {
  const url = (this as XMLHttpRequest & { _ssUrl?: string })._ssUrl || "";
  if (url.includes("/voyager/api/")) {
    const lower = name.toLowerCase();
    if (
      lower === "x-li-track" ||
      lower === "x-li-page-instance" ||
      lower === "x-li-pem-metadata" ||
      lower === "accept" ||
      lower === "x-li-deco-include-micro-schema" ||
      lower === "csrf-token" ||
      lower === "x-restli-protocol-version"
    ) {
      capturedVoyagerHeaders[lower] = value;
    }
  }
  return origSetRequestHeader.apply(this, [name, value]);
};

function checkForProfilePage(): void {
  const slug = extractSlugFromUrl(window.location.href);
  if (!slug) return;

  chrome.runtime.sendMessage({ action: "scrape_profile", slug }, (response) => {
    if (response?.profile) {
      injectProfileBadge(response.inCrm);
    }
  });
}

checkForProfilePage();

let lastUrl = location.href;
const observer = new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    setTimeout(checkForProfilePage, 1500);
  }
});

observer.observe(document.body, { childList: true, subtree: true });

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === "profile_scraped" && message.profile) {
    injectProfileBadge(true);
    return;
  }

  // Return captured Voyager headers and API URLs for debugging
  if (message.action === "get_captured_headers") {
    sendResponse({ headers: capturedVoyagerHeaders, apiUrls: capturedApiUrls });
    return;
  }

  // Proxy fetch: background asks us to make API calls in LinkedIn's page context
  if (message.action === "proxy_fetch") {
    (async () => {
      try {
        // Merge captured Voyager headers with the provided headers.
        // Captured headers are lower priority — provided headers override them.
        const mergedHeaders: Record<string, string> = {
          ...capturedVoyagerHeaders,
          ...message.headers,
        };

        // Force plain JSON — the normalized+json format uses $ref indirection
        // that makes parsing much harder. Plain JSON returns inline data.
        mergedHeaders["accept"] = "application/json";

        console.log("[SS-CS] proxy_fetch:", message.method || "GET", message.url);
        console.log("[SS-CS] Headers:", JSON.stringify(mergedHeaders).slice(0, 500));

        const response = await fetch(message.url, {
          method: message.method || "GET",
          headers: mergedHeaders,
          body: message.body || undefined,
          credentials: "include",
        });

        const text = await response.text();
        console.log("[SS-CS] Response:", response.status, text.slice(0, 200));
        sendResponse({ ok: response.ok, status: response.status, body: text });
      } catch (err) {
        console.error("[SS-CS] proxy_fetch error:", err);
        sendResponse({ ok: false, status: 0, body: String(err) });
      }
    })();
    return true; // keep sendResponse channel open for async
  }
});
