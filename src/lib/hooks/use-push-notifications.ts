"use client";

import { useState, useEffect, useCallback } from "react";
import {
  isPushSupported,
  getPushPermissionStatus,
  requestPushPermission,
  unsubscribePushClient,
} from "@/lib/push-client";

interface UsePushNotificationsReturn {
  isSupported: boolean;
  permission: NotificationPermission | "unsupported";
  isSubscribed: boolean;
  requestPermission: () => Promise<{ success: boolean; error?: string }>;
  unsubscribe: () => Promise<{ success: boolean }>;
}

function getInitialSupported() {
  if (typeof window === "undefined") return false;
  return isPushSupported();
}

function getInitialPermission(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined") return "default";
  return isPushSupported() ? getPushPermissionStatus() : "unsupported";
}

export function usePushNotifications(): UsePushNotificationsReturn {
  const [isSupported] = useState(getInitialSupported);
  const [permission, setPermission] = useState(getInitialPermission);
  const [isSubscribed, setIsSubscribed] = useState(false);

  // Check active subscription on mount
  useEffect(() => {
    if (!isSupported || permission !== "granted") return;

    navigator.serviceWorker.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then((subscription) => {
        setIsSubscribed(!!subscription);
      })
      .catch(() => {
        setIsSubscribed(false);
      });
  }, [isSupported, permission]);

  const requestPermission = useCallback(async () => {
    if (!isSupported) {
      return {
        success: false,
        error: "Les notifications push ne sont pas supportées par ce navigateur.",
      };
    }

    const result = await requestPushPermission();
    setPermission(result.permission);

    if (result.success) {
      setIsSubscribed(true);
    }

    return { success: result.success, error: result.error };
  }, [isSupported]);

  const unsubscribe = useCallback(async () => {
    const result = await unsubscribePushClient();
    if (result.success) {
      setIsSubscribed(false);
    }
    return result;
  }, []);

  return { isSupported, permission, isSubscribed, requestPermission, unsubscribe };
}
