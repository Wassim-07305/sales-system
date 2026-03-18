"use client";

import { useEffect, useRef, useCallback } from "react";

export function usePiP(videoElement: HTMLVideoElement | null) {
  const pipActiveRef = useRef(false);

  const enterPiP = useCallback(async () => {
    if (!videoElement || !document.pictureInPictureEnabled) return;
    if (document.pictureInPictureElement) return; // Deja en PiP

    try {
      await videoElement.requestPictureInPicture();
      pipActiveRef.current = true;
    } catch (err) {
      console.error("[PiP] Impossible d'activer:", err);
    }
  }, [videoElement]);

  const exitPiP = useCallback(async () => {
    if (!document.pictureInPictureElement) return;
    try {
      await document.exitPictureInPicture();
      pipActiveRef.current = false;
    } catch {
      // Deja sorti
    }
  }, []);

  // Ecouter la sortie du PiP
  useEffect(() => {
    if (!videoElement) return;

    const handleLeave = () => {
      pipActiveRef.current = false;
    };

    videoElement.addEventListener("leavepictureinpicture", handleLeave);
    return () => {
      videoElement.removeEventListener("leavepictureinpicture", handleLeave);
    };
  }, [videoElement]);

  return {
    enterPiP,
    exitPiP,
    isSupported:
      typeof document !== "undefined" && document.pictureInPictureEnabled,
  };
}
