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
 * Convert an ArrayBuffer to a base64 string.
 */
function arrayBufferToBase64(buffer: ArrayBuffer | null): string {
  if (!buffer) return "";
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
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
 * Ensure the service worker is registered and ready.
 * Returns the ServiceWorkerRegistration.
 */
async function ensureServiceWorker(): Promise<ServiceWorkerRegistration> {
  // Check if already registered
  const existingReg = await navigator.serviceWorker.getRegistration("/");
  if (existingReg) {
    return navigator.serviceWorker.ready;
  }

  // Register the SW
  await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  return navigator.serviceWorker.ready;
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

  if (!VAPID_PUBLIC_KEY) {
    return {
      success: false,
      permission: Notification.permission,
      error: "Clé VAPID non configurée. Contactez l'administrateur.",
    };
  }

  // Request permission
  const permission = await Notification.requestPermission();

  if (permission !== "granted") {
    return { success: false, permission };
  }

  try {
    // Ensure service worker is registered and active
    const registration = await ensureServiceWorker();

    // Check if already subscribed
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
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
    const registration = await navigator.serviceWorker.getRegistration("/");
    if (registration) {
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
      }
    }
    await fetch("/api/push", { method: "DELETE" });
    return { success: true };
  } catch {
    return { success: false };
  }
}
