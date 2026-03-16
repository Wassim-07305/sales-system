"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface UseMediaStreamReturn {
  stream: MediaStream | null;
  videoEnabled: boolean;
  audioEnabled: boolean;
  toggleVideo: () => void;
  toggleAudio: () => void;
  startStream: () => Promise<void>;
  stopStream: () => void;
  error: string | null;
}

function getMediaErrorMessage(err: unknown): string {
  if (err instanceof DOMException) {
    switch (err.name) {
      case "NotAllowedError":
        return "Accès refusé. Veuillez autoriser l'accès à la caméra et au micro dans les paramètres de votre navigateur.";
      case "NotFoundError":
        return "Aucun périphérique trouvé. Vérifiez que votre caméra et votre micro sont connectés.";
      case "NotReadableError":
        return "Le périphérique est déjà utilisé par une autre application. Fermez-la et réessayez.";
      case "OverconstrainedError":
        return "Les contraintes demandées ne sont pas supportées par votre appareil.";
      case "AbortError":
        return "La capture a été interrompue. Veuillez réessayer.";
      default:
        return `Erreur d'accès au média : ${err.message}`;
    }
  }
  if (err instanceof Error) {
    return `Erreur inattendue : ${err.message}`;
  }
  return "Une erreur inconnue est survenue lors de l'accès aux médias.";
}

export function useMediaStream(): UseMediaStreamReturn {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setStream(null);
    }
  }, []);

  const startStream = useCallback(async () => {
    // Stop any existing stream first
    stopStream();
    setError(null);

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      streamRef.current = mediaStream;
      setStream(mediaStream);
      setVideoEnabled(true);
      setAudioEnabled(true);
    } catch (err) {
      const message = getMediaErrorMessage(err);
      setError(message);
    }
  }, [stopStream]);

  const toggleVideo = useCallback(() => {
    if (!streamRef.current) return;
    const videoTracks = streamRef.current.getVideoTracks();
    videoTracks.forEach((track) => {
      track.enabled = !track.enabled;
    });
    setVideoEnabled((prev) => !prev);
  }, []);

  const toggleAudio = useCallback(() => {
    if (!streamRef.current) return;
    const audioTracks = streamRef.current.getAudioTracks();
    audioTracks.forEach((track) => {
      track.enabled = !track.enabled;
    });
    setAudioEnabled((prev) => !prev);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return {
    stream,
    videoEnabled,
    audioEnabled,
    toggleVideo,
    toggleAudio,
    startStream,
    stopStream,
    error,
  };
}
