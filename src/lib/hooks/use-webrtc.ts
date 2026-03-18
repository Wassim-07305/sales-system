"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/hooks/use-user";
import { useCallStore } from "@/stores/call-store";
import type { NetworkQuality } from "@/stores/call-store";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { TranscriptEntry } from "@/lib/types/database";

const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_BASE_DELAY_MS = 1000;
const STATS_POLL_INTERVAL_MS = 3000;

function getIceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ];

  const turnUsername = process.env.NEXT_PUBLIC_TURN_USERNAME;
  const turnCredential = process.env.NEXT_PUBLIC_TURN_CREDENTIAL;

  if (turnUsername && turnCredential) {
    servers.push({
      urls: "turn:a.relay.metered.ca:80",
      username: turnUsername,
      credential: turnCredential,
    });
    servers.push({
      urls: "turn:a.relay.metered.ca:443",
      username: turnUsername,
      credential: turnCredential,
    });
    servers.push({
      urls: "turn:a.relay.metered.ca:443?transport=tcp",
      username: turnUsername,
      credential: turnCredential,
    });
  }

  return servers;
}

function assessQuality(rtt: number, packetLoss: number): NetworkQuality {
  if (rtt < 100 && packetLoss < 1) return "excellent";
  if (rtt < 200 && packetLoss < 3) return "good";
  if (rtt < 400 && packetLoss < 8) return "fair";
  return "poor";
}

interface UseWebRTCOptions {
  sessionId: string;
  onError?: (message: string) => void;
}

export function useWebRTC({ sessionId, onError }: UseWebRTCOptions) {
  const supabase = createClient();
  const { user, profile } = useUser();

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const makingOfferRef = useRef(false);
  const ignoringOfferRef = useRef(false);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const statsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isCleanedUpRef = useRef(false);

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const myId = user?.id ?? "";
  const myName = profile?.full_name ?? "Utilisateur";

  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const isPolite = useCallback((remoteId: string) => myId < remoteId, [myId]);

  const reportError = useCallback((message: string) => {
    console.error("[WebRTC]", message);
    useCallStore.getState().setLastError(message);
    onErrorRef.current?.(message);
  }, []);

  const startStatsPolling = useCallback(() => {
    if (statsIntervalRef.current) return;
    let prevPacketsSent = 0;
    let prevPacketsLost = 0;

    statsIntervalRef.current = setInterval(async () => {
      const pc = pcRef.current;
      if (!pc || pc.connectionState !== "connected") return;

      try {
        const stats = await pc.getStats();
        let rtt = 0;
        let currentPacketsSent = 0;
        let currentPacketsLost = 0;

        stats.forEach((report) => {
          if (report.type === "candidate-pair" && report.nominated) {
            rtt = report.currentRoundTripTime
              ? report.currentRoundTripTime * 1000
              : 0;
          }
          if (report.type === "outbound-rtp" && report.kind === "video") {
            currentPacketsSent = report.packetsSent ?? 0;
          }
          if (report.type === "remote-inbound-rtp" && report.kind === "video") {
            currentPacketsLost = report.packetsLost ?? 0;
          }
        });

        const deltaSent = currentPacketsSent - prevPacketsSent;
        const deltaLost = currentPacketsLost - prevPacketsLost;
        prevPacketsSent = currentPacketsSent;
        prevPacketsLost = currentPacketsLost;

        const lossPercent =
          deltaSent > 0 ? (deltaLost / (deltaSent + deltaLost)) * 100 : 0;
        const quality = assessQuality(rtt, Math.max(0, lossPercent));
        useCallStore.getState().setNetworkQuality(quality);
      } catch {
        // Stats not available
      }
    }, STATS_POLL_INTERVAL_MS);
  }, []);

  const stopStatsPolling = useCallback(() => {
    if (statsIntervalRef.current) {
      clearInterval(statsIntervalRef.current);
      statsIntervalRef.current = null;
    }
    useCallStore.getState().setNetworkQuality("unknown");
  }, []);

  const cleanup = useCallback(() => {
    isCleanedUpRef.current = true;

    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    stopStatsPolling();

    try {
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    } catch {
      /* tracks already stopped */
    }
    localStreamRef.current = null;
    screenStreamRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);

    try {
      pcRef.current?.close();
    } catch {
      /* already closed */
    }
    pcRef.current = null;

    try {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    } catch {
      /* channel already removed */
    }
    channelRef.current = null;

    useCallStore.getState().setRemoteConnected(false);
    useCallStore.getState().setScreenSharing(false);
    useCallStore.getState().setReconnectAttempt(0);
  }, [supabase, stopStatsPolling]);

  const cleanupRef = useRef(cleanup);
  cleanupRef.current = cleanup;

  const attemptReconnect = useCallback(() => {
    const pc = pcRef.current;
    const store = useCallStore.getState();

    if (!pc || isCleanedUpRef.current) return;

    const attempt = store.reconnectAttempt + 1;
    if (attempt > MAX_RECONNECT_ATTEMPTS) {
      reportError(
        "Connexion perdue. Impossible de se reconnecter apres plusieurs tentatives.",
      );
      store.setPhase("ended");
      return;
    }

    store.setReconnectAttempt(attempt);
    store.setPhase("reconnecting");

    const delay = RECONNECT_BASE_DELAY_MS * Math.pow(2, attempt - 1);

    reconnectTimerRef.current = setTimeout(async () => {
      try {
        if (!pcRef.current || isCleanedUpRef.current) return;
        const offer = await pcRef.current.createOffer({ iceRestart: true });
        await pcRef.current.setLocalDescription(offer);
        channelRef.current?.send({
          type: "broadcast",
          event: "offer",
          payload: {
            sdp: pcRef.current.localDescription,
            senderId: myId,
            senderName: myName,
          },
        });
      } catch (err) {
        console.error(`[WebRTC] Reconnect attempt ${attempt} failed:`, err);
        attemptReconnect();
      }
    }, delay);
  }, [myId, myName, reportError]);

  const setupConnection = useCallback(async () => {
    if (!myId) {
      reportError("Utilisateur non authentifie.");
      return;
    }
    isCleanedUpRef.current = false;

    const store = useCallStore.getState();
    store.setPhase("joining");
    store.setLastError(null);
    store.setReconnectAttempt(0);

    // Get local media
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
    } catch {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: false,
          audio: true,
        });
        useCallStore.getState().toggleCamera();
        reportError(
          "Camera indisponible. L'appel continue en audio uniquement.",
        );
      } catch {
        reportError(
          "Impossible d'acceder au micro et a la camera. Verifiez les permissions de votre navigateur.",
        );
        useCallStore.getState().setPhase("ended");
        return;
      }
    }

    localStreamRef.current = stream;
    setLocalStream(stream);

    if (isCleanedUpRef.current) {
      stream.getTracks().forEach((t) => t.stop());
      return;
    }

    useCallStore.getState().setPhase("connecting");

    try {
      const pc = new RTCPeerConnection({ iceServers: getIceServers() });
      pcRef.current = pc;

      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      const remote = new MediaStream();
      const addedTrackIds = new Set<string>();
      setRemoteStream(remote);

      pc.ontrack = (e) => {
        e.streams[0]?.getTracks().forEach((track) => {
          if (!addedTrackIds.has(track.id)) {
            addedTrackIds.add(track.id);
            remote.addTrack(track);
            track.onended = () => {
              addedTrackIds.delete(track.id);
              try {
                remote.removeTrack(track);
              } catch {
                /* track already removed */
              }
            };
          }
        });
      };

      pc.onconnectionstatechange = () => {
        if (isCleanedUpRef.current) return;
        const s = useCallStore.getState();
        switch (pc.connectionState) {
          case "connected":
            s.setPhase("connected");
            s.setRemoteConnected(true);
            s.setReconnectAttempt(0);
            s.setLastError(null);
            if (!s.callStartTime) s.setCallStartTime(Date.now());
            startStatsPolling();
            break;
          case "disconnected":
            s.setPhase("reconnecting");
            s.setRemoteConnected(false);
            reconnectTimerRef.current = setTimeout(() => {
              if (
                pcRef.current?.connectionState === "disconnected" &&
                !isCleanedUpRef.current
              ) {
                attemptReconnect();
              }
            }, 2000);
            break;
          case "failed":
            s.setRemoteConnected(false);
            attemptReconnect();
            break;
          case "closed":
            s.setRemoteConnected(false);
            stopStatsPolling();
            break;
        }
      };

      pc.oniceconnectionstatechange = () => {
        if (
          pc.iceConnectionState === "failed" &&
          pc.connectionState !== "failed" &&
          !isCleanedUpRef.current
        ) {
          attemptReconnect();
        }
      };

      // Supabase broadcast channel for signaling
      const sigChannel = supabase.channel(`live-signal-${sessionId}`, {
        config: { broadcast: { self: false } },
      });
      channelRef.current = sigChannel;

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          sigChannel.send({
            type: "broadcast",
            event: "ice-candidate",
            payload: { candidate: e.candidate.toJSON(), senderId: myId },
          });
        }
      };

      pc.onnegotiationneeded = async () => {
        try {
          makingOfferRef.current = true;
          await pc.setLocalDescription();
          sigChannel.send({
            type: "broadcast",
            event: "offer",
            payload: {
              sdp: pc.localDescription,
              senderId: myId,
              senderName: myName,
            },
          });
        } catch (err) {
          console.error("[WebRTC] Negotiation error:", err);
        } finally {
          makingOfferRef.current = false;
        }
      };

      sigChannel
        .on("broadcast", { event: "offer" }, async ({ payload }) => {
          if (!pcRef.current || payload.senderId === myId) return;
          const currentPc = pcRef.current;
          const polite = isPolite(payload.senderId);

          const offerCollision =
            makingOfferRef.current || currentPc.signalingState !== "stable";

          ignoringOfferRef.current = !polite && offerCollision;
          if (ignoringOfferRef.current) return;

          useCallStore
            .getState()
            .setRemotePeer(payload.senderId, payload.senderName);

          try {
            await currentPc.setRemoteDescription(payload.sdp);
            await currentPc.setLocalDescription();
            sigChannel.send({
              type: "broadcast",
              event: "answer",
              payload: { sdp: currentPc.localDescription, senderId: myId },
            });
          } catch (err) {
            console.error("[WebRTC] Error handling offer:", err);
          }
        })
        .on("broadcast", { event: "answer" }, async ({ payload }) => {
          if (!pcRef.current || payload.senderId === myId) return;
          try {
            await pcRef.current.setRemoteDescription(payload.sdp);
          } catch (err) {
            console.error("[WebRTC] Error handling answer:", err);
          }
        })
        .on("broadcast", { event: "ice-candidate" }, async ({ payload }) => {
          if (!pcRef.current || payload.senderId === myId) return;
          try {
            await pcRef.current.addIceCandidate(payload.candidate);
          } catch (err) {
            if (!ignoringOfferRef.current)
              console.error("[WebRTC] ICE error:", err);
          }
        })
        .on("broadcast", { event: "join" }, async ({ payload }) => {
          if (payload.senderId === myId) return;
          useCallStore
            .getState()
            .setRemotePeer(payload.senderId, payload.senderName);
          if (!isPolite(payload.senderId)) {
            try {
              makingOfferRef.current = true;
              await pc.setLocalDescription();
              sigChannel.send({
                type: "broadcast",
                event: "offer",
                payload: {
                  sdp: pc.localDescription,
                  senderId: myId,
                  senderName: myName,
                },
              });
            } catch (err) {
              console.error("[WebRTC] Join offer error:", err);
            } finally {
              makingOfferRef.current = false;
            }
          }
        })
        .on("broadcast", { event: "transcript" }, ({ payload }) => {
          if (payload.senderId === myId) return;
          useCallStore
            .getState()
            .addTranscriptEntry(payload.entry as TranscriptEntry);
        })
        .on("broadcast", { event: "leave" }, ({ payload }) => {
          if (payload.senderId === myId) return;
          useCallStore.getState().setRemoteConnected(false);
          useCallStore.getState().setPhase("ended");
        })
        .subscribe(async (status) => {
          if (status === "SUBSCRIBED") {
            useCallStore.getState().setPhase("connected");
            if (!useCallStore.getState().callStartTime) {
              useCallStore.getState().setCallStartTime(Date.now());
            }
            sigChannel.send({
              type: "broadcast",
              event: "join",
              payload: { senderId: myId, senderName: myName },
            });
          } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            console.error("[WebRTC] Supabase channel error:", status);
            reportError(
              "Erreur de connexion au serveur de signalisation. Veuillez reessayer.",
            );
          }
        });
    } catch (err) {
      console.error("[WebRTC] Setup error:", err);
      reportError(
        "Erreur lors de la configuration de l'appel. Veuillez reessayer.",
      );
      useCallStore.getState().setPhase("ended");
    }
  }, [
    myId,
    myName,
    sessionId,
    supabase,
    isPolite,
    reportError,
    attemptReconnect,
    startStatsPolling,
    stopStatsPolling,
  ]);

  const joinCall = useCallback(async () => {
    await setupConnection();
  }, [setupConnection]);

  const leaveCall = useCallback(() => {
    try {
      channelRef.current?.send({
        type: "broadcast",
        event: "leave",
        payload: { senderId: myId },
      });
    } catch {
      /* channel may already be closed */
    }
    cleanup();
    useCallStore.getState().setPhase("ended");
  }, [myId, cleanup]);

  const toggleMic = useCallback(() => {
    const audioTrack = localStreamRef.current
      ?.getTracks()
      .find((t) => t.kind === "audio");
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      useCallStore.getState().toggleMic();
    }
  }, []);

  const toggleCamera = useCallback(() => {
    const videoTrack = localStreamRef.current
      ?.getTracks()
      .find((t) => t.kind === "video");
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      useCallStore.getState().toggleCamera();
    }
  }, []);

  const startScreenShare = useCallback(async () => {
    if (!pcRef.current) return;
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });
      screenStreamRef.current = screenStream;
      const screenTrack = screenStream.getVideoTracks()[0];

      const sender = pcRef.current
        .getSenders()
        .find((s) => s.track?.kind === "video");
      if (sender) {
        await sender.replaceTrack(screenTrack);
      }

      setLocalStream(screenStream);
      useCallStore.getState().setScreenSharing(true);

      screenTrack.onended = () => {
        stopScreenShare();
      };
    } catch (err) {
      if (err instanceof DOMException && err.name === "NotAllowedError") return;
      reportError(
        "Le partage d'ecran a echoue. Verifiez les permissions de votre navigateur.",
      );
    }
  }, [reportError]);

  const broadcastTranscript = useCallback(
    (entry: TranscriptEntry) => {
      channelRef.current?.send({
        type: "broadcast",
        event: "transcript",
        payload: { senderId: myId, entry },
      });
    },
    [myId],
  );

  const stopScreenShare = useCallback(async () => {
    if (!pcRef.current || !localStreamRef.current) return;
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;

    const cameraTrack = localStreamRef.current
      .getTracks()
      .find((t) => t.kind === "video");
    if (cameraTrack) {
      const sender = pcRef.current
        .getSenders()
        .find((s) => s.track?.kind === "video");
      if (sender) {
        await sender.replaceTrack(cameraTrack);
      }
    }

    setLocalStream(localStreamRef.current);
    useCallStore.getState().setScreenSharing(false);
  }, []);

  useEffect(() => {
    return () => {
      cleanupRef.current();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    localStream,
    remoteStream,
    cameraStream: localStreamRef.current,
    joinCall,
    leaveCall,
    toggleMic,
    toggleCamera,
    startScreenShare,
    stopScreenShare,
    broadcastTranscript,
  };
}
