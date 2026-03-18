"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/hooks/use-user";
import { useWebRTC } from "@/lib/hooks/use-webrtc";
import { useTranscription } from "@/lib/hooks/use-transcription";
import { useCallStore } from "@/stores/call-store";
import { usePiP } from "@/lib/hooks/use-pip";
import { updateLiveSessionStatus } from "@/lib/actions/live";
import { notifyPeer } from "@/lib/hooks/use-call-notifications";
import type { LiveSession, TranscriptEntry } from "@/lib/types/database";
import { VideoGrid } from "./video-grid";
import { CallControls } from "./call-controls";
import { CallTimer } from "./call-timer";
import { ConnectionStatus } from "./connection-status";
import { CallChatPanel } from "./call-chat-panel";
import { CallEndedSummary } from "./call-ended-summary";
import { TranscriptPanel } from "./transcript-panel";
import { SessionNotesPanel } from "./session-notes-panel";
import {
  Loader2,
  Mic,
  MicOff,
  Video,
  VideoOff,
  ArrowLeft,
  Radio,
} from "lucide-react";
import { toast } from "sonner";

interface LiveRoomViewProps {
  session: LiveSession;
}

export function LiveRoomView({ session }: LiveRoomViewProps) {
  const supabase = createClient();
  const { user, profile } = useUser();
  const phase = useCallStore((s) => s.phase);
  const callStartTime = useCallStore((s) => s.callStartTime);
  const transcriptEntries = useCallStore((s) => s.transcriptEntries);
  const resetCall = useCallStore((s) => s.resetCall);
  const router = useRouter();
  const pathname = usePathname();

  const [localVideoEl, setLocalVideoEl] = useState<HTMLVideoElement | null>(
    null,
  );

  const [hasJoined, setHasJoined] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [showHangUpConfirm, setShowHangUpConfirm] = useState(false);

  // Panel states
  const [showChat, setShowChat] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [showNotes, setShowNotes] = useState(false);

  // Preview lobby state
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const [previewMic, setPreviewMic] = useState(true);
  const [previewCamera, setPreviewCamera] = useState(true);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewAudioLevel, setPreviewAudioLevel] = useState(0);

  const previewVideoRef = useCallback(
    (el: HTMLVideoElement | null) => {
      if (el && previewStream) {
        el.srcObject = previewStream;
      }
    },
    [previewStream],
  );
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number>(0);

  const myId = user?.id ?? "";
  const myName = profile?.full_name ?? "Utilisateur";

  // Reset call store on mount
  useEffect(() => {
    resetCall();
  }, [session.id, resetCall]);

  const handleWebRTCError = useCallback((message: string) => {
    toast.error(message, { duration: 5000 });
  }, []);

  // Request preview media on mount
  useEffect(() => {
    let cancelled = false;

    async function getPreview() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        setPreviewStream(stream);

        const audioCtx = new AudioContext();
        if (audioCtx.state === "suspended") {
          await audioCtx.resume();
        }
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        audioCtxRef.current = audioCtx;
        analyserRef.current = analyser;
      } catch {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: false,
            audio: true,
          });
          if (cancelled) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }
          setPreviewStream(stream);
          setPreviewCamera(false);
          setPreviewError("Camera indisponible, audio uniquement");
        } catch {
          if (!cancelled) {
            setPreviewError("Impossible d'acceder au micro et a la camera");
            toast.error(
              "Verifiez les permissions de votre navigateur pour le micro et la camera.",
              { duration: 6000 },
            );
          }
        }
      }
    }
    getPreview();

    return () => {
      cancelled = true;
    };
  }, []);

  // Audio level meter
  useEffect(() => {
    if (!analyserRef.current || !previewMic) {
      setPreviewAudioLevel(0);
      return;
    }
    const analyser = analyserRef.current;
    const data = new Uint8Array(analyser.frequencyBinCount);

    function tick() {
      analyser.getByteFrequencyData(data);
      const avg = data.reduce((a, b) => a + b, 0) / data.length;
      setPreviewAudioLevel(Math.min(avg / 80, 1));
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [previewMic]);

  const togglePreviewMic = useCallback(() => {
    if (audioCtxRef.current?.state === "suspended") {
      audioCtxRef.current.resume();
    }
    previewStream?.getAudioTracks().forEach((t) => {
      t.enabled = !t.enabled;
    });
    setPreviewMic((v) => !v);
  }, [previewStream]);

  const togglePreviewCamera = useCallback(() => {
    previewStream?.getVideoTracks().forEach((t) => {
      t.enabled = !t.enabled;
    });
    setPreviewCamera((v) => !v);
  }, [previewStream]);

  const cleanupPreview = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
    analyserRef.current = null;
    previewStream?.getTracks().forEach((t) => t.stop());
    setPreviewStream(null);
  }, [previewStream]);

  useEffect(() => {
    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      previewStream?.getTracks().forEach((t) => t.stop());
      cancelAnimationFrame(rafRef.current);
      audioCtxRef.current?.close();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const {
    localStream,
    remoteStream,
    joinCall,
    leaveCall,
    toggleMic,
    toggleCamera,
    startScreenShare,
    stopScreenShare,
    cameraStream,
    broadcastTranscript,
  } = useWebRTC({ sessionId: session.id, onError: handleWebRTCError });

  // Transcription
  const {
    isSupported: isTranscriptionSupported,
    isListening: isTranscribing,
    start: startTranscription,
    stop: stopTranscription,
  } = useTranscription({
    onEntry: useCallback(
      (text: string) => {
        const entry: TranscriptEntry = {
          id: crypto.randomUUID(),
          speaker: myName,
          speakerId: myId,
          text,
          timestamp: callStartTime ? Date.now() - callStartTime : 0,
        };
        useCallStore.getState().addTranscriptEntry(entry);
        broadcastTranscript(entry);
      },
      [myName, myId, callStartTime, broadcastTranscript],
    ),
  });

  const togglePanel = useCallback(
    (panel: "chat" | "transcript" | "notes") => {
      if (panel === "chat") {
        setShowChat((v) => !v);
        if (!showChat) {
          setShowTranscript(false);
          setShowNotes(false);
        }
      } else if (panel === "transcript") {
        if (isTranscribing) {
          stopTranscription();
          useCallStore.getState().setTranscribing(false);
        } else {
          startTranscription();
          useCallStore.getState().setTranscribing(true);
        }
        setShowTranscript((v) => !v);
        if (!showTranscript) {
          setShowChat(false);
          setShowNotes(false);
        }
      } else if (panel === "notes") {
        setShowNotes((v) => !v);
        if (!showNotes) {
          setShowChat(false);
          setShowTranscript(false);
        }
      }
    },
    [
      showChat,
      showTranscript,
      showNotes,
      isTranscribing,
      startTranscription,
      stopTranscription,
    ],
  );

  // Join
  const handleJoin = useCallback(async () => {
    if (isJoining) return;

    setIsJoining(true);
    cleanupPreview();
    resetCall();

    const s = useCallStore.getState();
    if (!previewMic) s.toggleMic();
    if (!previewCamera) s.toggleCamera();

    await joinCall();

    const currentPhase = useCallStore.getState().phase;
    if (currentPhase === "ended") {
      setIsJoining(false);
      return;
    }

    setHasJoined(true);
    setIsJoining(false);

    // Mark session as live
    try {
      await updateLiveSessionStatus(session.id, "live");
    } catch {
      // Non-blocking
    }

    // Notify the peer
    const peerId =
      session.guest_id === myId ? session.host_id : session.guest_id;
    if (peerId) {
      notifyPeer(supabase, peerId, session.id, myName);
    }
  }, [
    session.id,
    session.host_id,
    session.guest_id,
    myId,
    myName,
    joinCall,
    cleanupPreview,
    previewMic,
    previewCamera,
    isJoining,
    resetCall,
    supabase,
  ]);

  // Hang up
  const executeHangUp = useCallback(async () => {
    setShowHangUpConfirm(false);

    // Stop transcription if active
    if (isTranscribing) {
      stopTranscription();
      useCallStore.getState().setTranscribing(false);
    }

    try {
      await updateLiveSessionStatus(session.id, "ended");
    } catch {
      // Non-blocking
    }

    leaveCall();
  }, [session.id, leaveCall, isTranscribing, stopTranscription]);

  const handleHangUp = useCallback(() => {
    const s = useCallStore.getState();
    if (s.callStartTime && Date.now() - s.callStartTime > 5000) {
      setShowHangUpConfirm(true);
    } else {
      executeHangUp();
    }
  }, [executeHangUp]);

  const handleToggleScreenShare = useCallback(() => {
    if (useCallStore.getState().isScreenSharing) {
      stopScreenShare();
    } else {
      startScreenShare();
    }
  }, [startScreenShare, stopScreenShare]);

  // Warn before unload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const { phase } = useCallStore.getState();
      if (phase === "connected" || phase === "connecting") {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  // Picture-in-Picture : mini-player flottant quand on quitte la page live
  const { enterPiP, exitPiP } = usePiP(localVideoEl);
  const isOnLivePage = pathname.startsWith(`/live/${session.id}`);

  useEffect(() => {
    if (!isOnLivePage && phase === "connected" && localVideoEl) {
      enterPiP();
    } else if (isOnLivePage) {
      exitPiP();
    }
  }, [isOnLivePage, phase, localVideoEl, enterPiP, exitPiP]);

  // Reconnection toast
  useEffect(() => {
    if (phase === "reconnecting" && hasJoined) {
      toast.warning("Reconnexion en cours...", {
        id: "reconnecting-toast",
        duration: Infinity,
      });
    } else if (phase === "connected" && hasJoined) {
      toast.dismiss("reconnecting-toast");
    }
  }, [phase, hasJoined]);

  // Determine session type label
  const sessionTypeLabel =
    session.session_type === "one_on_one"
      ? "Appel 1-to-1"
      : session.session_type === "screen_share"
        ? "Partage d'ecran"
        : "Live";

  const peerName =
    session.host?.full_name && session.guest?.full_name
      ? profile?.id === session.host.id
        ? session.guest.full_name
        : session.host.full_name
      : null;

  // Ended state — summary
  if (phase === "ended" && hasJoined) {
    const durationSeconds = callStartTime
      ? Math.round((Date.now() - callStartTime) / 1000)
      : null;

    return (
      <CallEndedSummary
        session={session}
        durationSeconds={durationSeconds}
        transcriptEntries={transcriptEntries}
      />
    );
  }

  // Pre-join lobby
  if (!hasJoined) {
    const hasVideoTrack =
      previewStream?.getVideoTracks().some((t) => t.enabled) && previewCamera;

    return (
      <div className="flex-1 flex items-center justify-center bg-background p-4 relative">
        <button
          onClick={() => router.push("/live")}
          className="absolute top-4 left-4 flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour
        </button>

        <div className="flex flex-col items-center gap-6 w-full max-w-lg">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-800 text-xs text-zinc-300 mb-3">
              <Radio className="w-3.5 h-3.5" />
              {sessionTypeLabel}
            </div>
            <h2 className="text-xl font-semibold text-white">
              {session.title}
            </h2>
            {peerName && (
              <p className="text-sm text-zinc-400 mt-1">Avec {peerName}</p>
            )}
          </div>

          {/* Video preview */}
          <div className="relative w-full aspect-video bg-muted rounded-2xl overflow-hidden">
            {hasVideoTrack ? (
              <video
                ref={previewVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center">
                <div className="w-20 h-20 rounded-full bg-zinc-800 flex items-center justify-center text-2xl font-bold text-white uppercase">
                  {myName.charAt(0)}
                </div>
                <span className="text-sm text-zinc-500 mt-3">
                  {previewError ?? "Camera desactivee"}
                </span>
              </div>
            )}

            {/* Mic level indicator */}
            {previewMic && (
              <div className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-black/50 backdrop-blur-sm rounded-lg px-2.5 py-1.5">
                <Mic className="w-3.5 h-3.5 text-[#7af17a]" />
                <div className="flex items-end gap-px h-3">
                  {[0.15, 0.3, 0.5, 0.7, 0.9].map((threshold, i) => (
                    <div
                      key={i}
                      className="w-1 rounded-full transition-all duration-75"
                      style={{
                        height: `${40 + i * 15}%`,
                        backgroundColor:
                          previewAudioLevel >= threshold
                            ? "#7af17a"
                            : "#3f3f46",
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="absolute bottom-3 right-3 bg-black/50 backdrop-blur-sm rounded-lg px-2.5 py-1">
              <span className="text-xs text-white font-medium">Vous</span>
            </div>
          </div>

          {/* Preview controls */}
          <div className="flex items-center gap-3">
            <button
              onClick={togglePreviewMic}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-90 ${
                previewMic
                  ? "bg-zinc-800 text-white hover:bg-zinc-700"
                  : "bg-red-600/20 text-red-400 hover:bg-red-600/30"
              }`}
              title={previewMic ? "Couper le micro" : "Activer le micro"}
            >
              {previewMic ? (
                <Mic className="w-5 h-5" />
              ) : (
                <MicOff className="w-5 h-5" />
              )}
            </button>

            <button
              onClick={togglePreviewCamera}
              disabled={!previewStream?.getVideoTracks().length}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-90 disabled:opacity-30 disabled:pointer-events-none ${
                previewCamera
                  ? "bg-zinc-800 text-white hover:bg-zinc-700"
                  : "bg-red-600/20 text-red-400 hover:bg-red-600/30"
              }`}
              title={previewCamera ? "Couper la camera" : "Activer la camera"}
            >
              {previewCamera ? (
                <Video className="w-5 h-5" />
              ) : (
                <VideoOff className="w-5 h-5" />
              )}
            </button>

            <button
              onClick={handleJoin}
              disabled={isJoining}
              className="h-12 px-8 rounded-full bg-[#7af17a] text-zinc-900 text-sm font-semibold hover:bg-[#6ae06a] transition-all active:scale-[0.97] flex items-center gap-2 ml-2 disabled:opacity-70 disabled:pointer-events-none"
            >
              {isJoining ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Connexion...
                </>
              ) : (
                "Rejoindre"
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // In-call view
  return (
    <div className="flex-1 flex bg-zinc-950 h-full">
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-zinc-950/80 backdrop-blur-md border-b border-white/5">
          <div className="flex items-center gap-3">
            <ConnectionStatus />
            <span className="text-xs text-zinc-400 hidden sm:inline">
              {session.title}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-600/20">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[10px] font-medium text-red-400 uppercase tracking-wider">
                Live
              </span>
            </div>
            <CallTimer />
          </div>
        </div>

        {/* Video grid */}
        <VideoGrid
          localStream={localStream}
          remoteStream={remoteStream}
          cameraStream={cameraStream}
          localName={myName}
          onLocalVideoRef={setLocalVideoEl}
        />

        {/* Controls */}
        <CallControls
          onToggleMic={toggleMic}
          onToggleCamera={toggleCamera}
          onToggleScreenShare={handleToggleScreenShare}
          onHangUp={handleHangUp}
          onToggleChat={() => togglePanel("chat")}
          onToggleTranscript={() => togglePanel("transcript")}
          onToggleNotes={() => togglePanel("notes")}
          isChatOpen={showChat}
          isTranscriptOpen={showTranscript}
          isNotesOpen={showNotes}
          isTranscriptionSupported={isTranscriptionSupported}
        />
      </div>

      {/* Side panel - single slot, only one open at a time */}
      {(showChat || showTranscript || showNotes) && (
        <div className="w-80 flex-shrink-0 border-l border-border bg-card">
          {showChat && (
            <CallChatPanel
              sessionId={session.id}
              onClose={() => setShowChat(false)}
            />
          )}
          {showTranscript && (
            <TranscriptPanel
              sessionTitle={session.title}
              onClose={() => setShowTranscript(false)}
            />
          )}
          {showNotes && (
            <SessionNotesPanel
              sessionId={session.id}
              onClose={() => setShowNotes(false)}
            />
          )}
        </div>
      )}

      {/* Hang-up confirmation dialog */}
      {showHangUpConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 max-w-sm mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-600/20 flex items-center justify-center">
                <Video className="w-5 h-5 text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">
                Quitter la session ?
              </h3>
            </div>
            <p className="text-sm text-zinc-400 mb-6">
              Etes-vous sur de vouloir quitter ? La session sera terminee pour
              tous les participants.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowHangUpConfirm(false)}
                className="flex-1 h-10 rounded-xl bg-zinc-800 text-white text-sm font-medium hover:bg-zinc-700 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={executeHangUp}
                className="flex-1 h-10 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors"
              >
                Quitter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
