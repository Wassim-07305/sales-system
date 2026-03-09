/**
 * Client-side helpers for Web Push notifications.
 * Handles browser permission requests and service worker subscription.
 */

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

/**
 * Convert a URL-safe base64 VAPID key to a Uint8Array for the Push API.
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Check if the browser supports push notifications.
 */
export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/**
 * Get the current push permission status.
 */
export function getPushPermissionStatus(): NotificationPermission | "unsupported" {
  if (!isPushSupported()) return "unsupported";
  return Notification.permission;
}

/**
 * Request push notification permission, register the service worker,
 * and subscribe the user to web push. Sends the subscription to the
 * server via the /api/push endpoint.
 *
 * Returns { success, permission, error? }
 */
export async function requestPushPermission(): Promise<{
  success: boolean;
  permission: NotificationPermission | "unsupported";
  error?: string;
}> {
  if (!isPushSupported()) {
    return {
      success: false,
      permission: "unsupported",
      error: "Les notifications push ne sont pas supportées par ce navigateur.",
    };
  }

  // Request permission
  const permission = await Notification.requestPermission();

  if (permission !== "granted") {
    return { success: false, permission };
  }

  try {
    // Register service worker (assumes /sw.js exists via next-pwa)
    const registration = await navigator.serviceWorker.ready;

    // Check if already subscribed
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      if (!VAPID_PUBLIC_KEY) {
        // No VAPID key configured — we still record the permission grant
        console.warn(
          "[Push] VAPID public key non configurée. Abonnement push simulé."
        );
        // Send a stub subscription to the server so we track the intent
        await fetch("/api/push", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            endpoint: `https://stub-push.salessystem.local/${Date.now()}`,
            keys: { p256dh: "stub", auth: "stub" },
          }),
        });
        return { success: true, permission };
      }

      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      });
    }

    // Send subscription to server
    const response = await fetch("/api/push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: subscription.endpoint,
        keys: {
          p256dh: arrayBufferToBase64(subscription.getKey("p256dh")),
          auth: arrayBufferToBase64(subscription.getKey("auth")),
        },
      }),
    });

    if (!response.ok) {
      const data = await response.json();
      return {
        success: false,
        permission,
        error: data.error || "Erreur lors de l'enregistrement.",
      };
    }

    return { success: true, permission };
  } catch (err) {
    console.error("[Push] Erreur abonnement:", err);
    return {
      success: false,
      permission,
      error: err instanceof Error ? err.message : "Erreur inconnue",
    };
  }
}

/**
 * Unsubscribe from push notifications.
 */
export async function unsubscribePushClient(): Promise<{ success: boolean }> {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await subscription.unsubscribe();
    }
    await fetch("/api/push", { method: "DELETE" });
    return { success: true };
  } catch {
    return { success: false };
  }
}

function arrayBufferToBase64(buffer: ArrayBuffer | null): string {
  if (!buffer) return "";
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}
