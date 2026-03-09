import { injectProfileBadge, extractSlugFromUrl } from "./profile-badge";
import { createFloatingPanel } from "./panel";

createFloatingPanel();

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

chrome.runtime.onMessage.addListener((message) => {
  if (message.action === "profile_scraped" && message.profile) {
    injectProfileBadge(true);
  }
});
