import { runSync, processPendingMessages } from "./sync-engine";
import { loginToSupabase, logoutSupabase, getProspectByUrl, upsertProspect } from "./supabase-client";
import { fetchProfile } from "./linkedin-api";
import { getAuth, getLinkedInAuth, getSyncState, setLinkedInAuth } from "../shared/storage";
import { SYNC_INTERVAL_MINUTES, PENDING_SEND_POLL_SECONDS } from "../shared/constants";
import type { ExtensionMessage } from "../shared/types";

// ---- CSRF Token Capture ----
chrome.webRequest.onSendHeaders.addListener(
  (details) => {
    const csrfHeader = details.requestHeaders?.find(
      (h) => h.name.toLowerCase() === "csrf-token"
    );
    if (csrfHeader?.value) {
      setLinkedInAuth({ csrfToken: csrfHeader.value, isLoggedIn: true });
    }
  },
  { urls: ["https://www.linkedin.com/voyager/api/*"] },
  ["requestHeaders"]
);

// ---- Alarms for periodic sync ----
chrome.alarms.create("sync-conversations", {
  periodInMinutes: SYNC_INTERVAL_MINUTES,
});

chrome.alarms.create("process-pending", {
  periodInMinutes: PENDING_SEND_POLL_SECONDS / 60,
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "sync-conversations") {
    await runSync();
  } else if (alarm.name === "process-pending") {
    await processPendingMessages();
  }
});

// ---- Message handler ----
chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, _sender, sendResponse) => {
    handleMessage(message).then(sendResponse);
    return true;
  }
);

async function handleMessage(message: ExtensionMessage): Promise<unknown> {
  switch (message.action) {
    case "get_status": {
      const auth = await getAuth();
      const linkedin = await getLinkedInAuth();
      const sync = await getSyncState();
      return { action: "status_response", auth, linkedin, sync };
    }

    case "login": {
      const result = await loginToSupabase(
        message.email,
        message.password,
        "https://tzyqmcuzmvxgexjtsbfe.supabase.co",
        "sb_publishable_4l0q-xIn34hedAOyxJqEnw_rQo5m4nN"
      );
      return { action: "login_result", ...result };
    }

    case "logout": {
      await logoutSupabase();
      return { success: true };
    }

    case "scrape_profile": {
      const profile = await fetchProfile(message.slug);
      if (!profile) return { action: "profile_scraped", profile: null, inCrm: false };

      const profileUrl = "https://www.linkedin.com/in/" + profile.publicIdentifier + "/";
      const existing = await getProspectByUrl(profileUrl);

      if (!existing) {
        await upsertProspect({
          name: (profile.firstName + " " + profile.lastName).trim(),
          profile_url: profileUrl,
          platform: "linkedin",
        });
      }

      return { action: "profile_scraped", profile, inCrm: !!existing };
    }

    case "force_sync": {
      await runSync();
      const sync = await getSyncState();
      return { action: "sync_complete", sync };
    }

    default:
      return { error: "Unknown action" };
  }
}

chrome.runtime.onInstalled.addListener(() => {
  console.log("[Sales System LinkedIn Bridge] Extension installed");
});
