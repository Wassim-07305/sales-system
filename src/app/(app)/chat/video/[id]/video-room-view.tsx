"use client";

import { useState, useTransition, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Camera,
  CameraOff,
  Mic,
  MicOff,
  MonitorUp,
  PhoneOff,
  Play,
  Users,
  MessageSquare,
  BarChart3,
  Plus,
  Send,
  Circle,
  ArrowLeft,
  MonitorOff,
} from "lucide-react";
import {
  joinRoom,
  startRoom,
  endRoom,
  createPoll,
  votePoll,
  getRoomPolls,
} from "@/lib/actions/communication";
import { useMediaStream } from "@/lib/hooks/use-media-stream";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Participant {
  id: string;
  user_id: string;
  joined_at: string | null;
  left_at: string | null;
  user?: {
    id: string;
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  } | null;
}

interface Poll {
  id: string;
  question: string;
  options: Array<{ text: string; vote_count: number }>;
  is_active: boolean;
  created_at: string;
}

interface VideoRoom {
  id: string;
  title: string;
  host_id: string;
  status: "scheduled" | "live" | "ended";
  scheduled_at: string | null;
  started_at: string | null;
  ended_at: string | null;
  max_participants: number;
  host?: {
    id: string;
    full_name: string | null;
    email: string;
  } | null;
  participants: Participant[];
}

interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  time: string;
}

// Peer state tracked per remote user
interface PeerState {
  pc: RTCPeerConnection;
  remoteStream: MediaStream;
}

// ICE servers — free Google STUN
const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function VideoRoomView({
  room,
  currentUserId,
}: {
  room: VideoRoom;
  currentUserId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [screenSharing, setScreenSharing] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<"participants" | "chat" | "polls">("participants");

  // Media stream hook
  const {
    stream,
    videoEnabled,
    audioEnabled,
    toggleVideo,
    toggleAudio,
    startStream,
    stopStream,
    error: mediaError,
  } = useMediaStream();

  // Screen share stream
  const screenStreamRef = useRef<MediaStream | null>(null);

  // Video refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // Recording state
  const [autoRecordEnabled, setAutoRecordEnabled] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // Chat state (local only — broadcast via Realtime)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");

  // Poll state
  const [polls, setPolls] = useState<Poll[]>([]);
  const [pollDialogOpen, setPollDialogOpen] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);

  // ---------------------------------------------------------------------------
  // WebRTC state
  // ---------------------------------------------------------------------------
  const peersRef = useRef<Map<string, PeerState>>(new Map());
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const signalingChannelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);
  const supabaseRef = useRef(createClient());
  // Track whether we have already joined the signaling channel
  const signalingJoinedRef = useRef(false);
  // Keep a ref to the current local stream so callbacks always have the latest
  const localStreamRef = useRef<MediaStream | null>(null);

  const isHost = room.host_id === currentUserId;
  const isLive = room.status === "live";
  const isScheduled = room.status === "scheduled";
  const activeParticipants = room.participants.filter((p) => !p.left_at);

  // Keep localStreamRef in sync
  useEffect(() => {
    localStreamRef.current = stream;
  }, [stream]);

  // ---------------------------------------------------------------------------
  // WebRTC helpers
  // ---------------------------------------------------------------------------

  const createPeerConnection = useCallback(
    (remoteUserId: string): RTCPeerConnection => {
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

      // Create a remote stream to collect incoming tracks
      const remoteStream = new MediaStream();

      // Add local tracks if available
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current!);
        });
      }

      // Handle incoming tracks
      pc.ontrack = (event) => {
        event.streams[0]?.getTracks().forEach((track) => {
          remoteStream.addTrack(track);
        });
        // Also add any track not part of a stream
        if (!event.streams[0]) {
          remoteStream.addTrack(event.track);
        }
        setRemoteStreams((prev) => {
          const next = new Map(prev);
          next.set(remoteUserId, remoteStream);
          return next;
        });
      };

      // ICE candidate exchange
      pc.onicecandidate = (event) => {
        if (event.candidate && signalingChannelRef.current) {
          signalingChannelRef.current.send({
            type: "broadcast",
            event: "webrtc-signal",
            payload: {
              type: "ice-candidate",
              candidate: event.candidate.toJSON(),
              from: currentUserId,
              to: remoteUserId,
            },
          });
        }
      };

      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === "failed" || pc.iceConnectionState === "disconnected") {
          // Cleanup on disconnect
          cleanupPeer(remoteUserId);
        }
      };

      peersRef.current.set(remoteUserId, { pc, remoteStream });
      return pc;
    },
    [currentUserId],
  );

  const cleanupPeer = useCallback((remoteUserId: string) => {
    const peer = peersRef.current.get(remoteUserId);
    if (peer) {
      peer.pc.close();
      peersRef.current.delete(remoteUserId);
      setRemoteStreams((prev) => {
        const next = new Map(prev);
        next.delete(remoteUserId);
        return next;
      });
    }
  }, []);

  const cleanupAllPeers = useCallback(() => {
    peersRef.current.forEach((peer, id) => {
      peer.pc.close();
    });
    peersRef.current.clear();
    setRemoteStreams(new Map());
  }, []);

  // ---------------------------------------------------------------------------
  // Signaling via Supabase Realtime
  // ---------------------------------------------------------------------------

  const setupSignaling = useCallback(() => {
    if (signalingJoinedRef.current) return;
    signalingJoinedRef.current = true;

    const supabase = supabaseRef.current;
    const channel = supabase.channel(`video-room-${room.id}`, {
      config: { broadcast: { self: false } },
    });

    signalingChannelRef.current = channel;

    channel.on("broadcast", { event: "webrtc-signal" }, async ({ payload }) => {
      if (!payload) return;
      const { type, from, to } = payload as {
        type: string;
        from: string;
        to?: string;
        candidate?: RTCIceCandidateInit;
        sdp?: RTCSessionDescriptionInit;
      };

      // Ignore messages not meant for us (except "join" which is broadcast to all)
      if (to && to !== currentUserId) return;
      if (from === currentUserId) return;

      switch (type) {
        case "join": {
          // A new peer joined — we initiate the offer
          const pc = createPeerConnection(from);
          try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            channel.send({
              type: "broadcast",
              event: "webrtc-signal",
              payload: {
                type: "offer",
                sdp: pc.localDescription,
                from: currentUserId,
                to: from,
              },
            });
          } catch (err) {
            console.error("[WebRTC] Error creating offer:", err);
          }
          break;
        }

        case "offer": {
          const { sdp } = payload as { sdp: RTCSessionDescriptionInit; from: string };
          // Create peer connection for the offerer if we don't have one
          let pc: RTCPeerConnection;
          const existing = peersRef.current.get(from);
          if (existing) {
            pc = existing.pc;
          } else {
            pc = createPeerConnection(from);
          }

          try {
            await pc.setRemoteDescription(new RTCSessionDescription(sdp));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            channel.send({
              type: "broadcast",
              event: "webrtc-signal",
              payload: {
                type: "answer",
                sdp: pc.localDescription,
                from: currentUserId,
                to: from,
              },
            });
          } catch (err) {
            console.error("[WebRTC] Error handling offer:", err);
          }
          break;
        }

        case "answer": {
          const { sdp } = payload as { sdp: RTCSessionDescriptionInit; from: string };
          const peer = peersRef.current.get(from);
          if (peer) {
            try {
              await peer.pc.setRemoteDescription(new RTCSessionDescription(sdp));
            } catch (err) {
              console.error("[WebRTC] Error setting remote description:", err);
            }
          }
          break;
        }

        case "ice-candidate": {
          const { candidate } = payload as { candidate: RTCIceCandidateInit; from: string };
          const peer = peersRef.current.get(from);
          if (peer && candidate) {
            try {
              await peer.pc.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (err) {
              console.error("[WebRTC] Error adding ICE candidate:", err);
            }
          }
          break;
        }

        case "leave": {
          cleanupPeer(from);
          break;
        }
      }
    });

    // Also receive chat messages via broadcast
    channel.on("broadcast", { event: "chat-message" }, ({ payload }) => {
      if (!payload) return;
      const msg = payload as ChatMessage;
      if (msg.id) {
        setChatMessages((prev) => {
          // Deduplicate
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
    });

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        // Announce our presence so existing peers send us offers
        channel.send({
          type: "broadcast",
          event: "webrtc-signal",
          payload: {
            type: "join",
            from: currentUserId,
          },
        });
      }
    });
  }, [room.id, currentUserId, createPeerConnection, cleanupPeer]);

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  // Attach local stream to video element
  useEffect(() => {
    if (localVideoRef.current && stream) {
      localVideoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Attach the first remote stream to the remote video element
  useEffect(() => {
    if (remoteVideoRef.current && remoteStreams.size > 0) {
      const firstRemote = remoteStreams.values().next().value;
      if (firstRemote) {
        remoteVideoRef.current.srcObject = firstRemote;
      }
    }
  }, [remoteStreams]);

  // Show media errors as toasts
  useEffect(() => {
    if (mediaError) {
      toast.error(mediaError);
    }
  }, [mediaError]);

  // Auto-start media and signaling when room is live
  useEffect(() => {
    if (isLive && !stream) {
      startStream();
    }
  }, [isLive]); // eslint-disable-line react-hooks/exhaustive-deps

  // Set up signaling when we have a local stream and room is live
  useEffect(() => {
    if (isLive && stream) {
      setupSignaling();
    }
  }, [isLive, stream, setupSignaling]);

  // When local stream changes, update tracks on existing peer connections
  useEffect(() => {
    if (!stream) return;
    peersRef.current.forEach((peer) => {
      const senders = peer.pc.getSenders();
      stream.getTracks().forEach((track) => {
        const existingSender = senders.find((s) => s.track?.kind === track.kind);
        if (existingSender) {
          existingSender.replaceTrack(track).catch(() => {});
        } else {
          peer.pc.addTrack(track, stream);
        }
      });
    });
  }, [stream]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Announce leave
      if (signalingChannelRef.current) {
        signalingChannelRef.current.send({
          type: "broadcast",
          event: "webrtc-signal",
          payload: { type: "leave", from: currentUserId },
        });
        supabaseRef.current.removeChannel(signalingChannelRef.current);
        signalingChannelRef.current = null;
        signalingJoinedRef.current = false;
      }
      // Close all peer connections
      peersRef.current.forEach((peer) => peer.pc.close());
      peersRef.current.clear();
      // Stop screen share
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------------------------------------------------------------------------
  // Screen share
  // ---------------------------------------------------------------------------

  const handleScreenShare = useCallback(async () => {
    if (screenSharing) {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((track) => track.stop());
        screenStreamRef.current = null;
      }
      setScreenSharing(false);
      toast.info("Partage d'écran arrêté");
      return;
    }

    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });
      screenStreamRef.current = displayStream;
      setScreenSharing(true);
      toast.success("Partage d'écran activé");

      // Replace video track on all peer connections with screen share track
      const screenTrack = displayStream.getVideoTracks()[0];
      peersRef.current.forEach((peer) => {
        const videoSender = peer.pc.getSenders().find((s) => s.track?.kind === "video");
        if (videoSender) {
          videoSender.replaceTrack(screenTrack).catch(() => {});
        }
      });

      screenTrack.addEventListener("ended", () => {
        screenStreamRef.current = null;
        setScreenSharing(false);
        toast.info("Partage d'écran arrêté");
        // Restore camera track
        const cameraTrack = localStreamRef.current?.getVideoTracks()[0];
        if (cameraTrack) {
          peersRef.current.forEach((peer) => {
            const videoSender = peer.pc.getSenders().find((s) => s.track?.kind === "video");
            if (videoSender) {
              videoSender.replaceTrack(cameraTrack).catch(() => {});
            }
          });
        }
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        return;
      }
      toast.error("Impossible de partager l'écran. Vérifiez les autorisations de votre navigateur.");
    }
  }, [screenSharing]);

  // ---------------------------------------------------------------------------
  // Recording — real MediaRecorder
  // ---------------------------------------------------------------------------

  function startRecording() {
    const tracks: MediaStreamTrack[] = [];

    // Add local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => tracks.push(t));
    }

    // Add first remote stream tracks
    if (remoteStreams.size > 0) {
      const firstRemote = remoteStreams.values().next().value;
      if (firstRemote) {
        (firstRemote as MediaStream).getTracks().forEach((t: MediaStreamTrack) => tracks.push(t));
      }
    }

    if (tracks.length === 0) {
      toast.error("Aucun flux disponible pour l'enregistrement");
      return;
    }

    const combined = new MediaStream(tracks);

    // Choose a supported mimeType
    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
      ? "video/webm;codecs=vp9,opus"
      : MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")
        ? "video/webm;codecs=vp8,opus"
        : "video/webm";

    try {
      const recorder = new MediaRecorder(combined, { mimeType });
      recordedChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
        if (blob.size === 0) return;

        try {
          const supabase = supabaseRef.current;
          const filename = `room-${room.id}-${Date.now()}.webm`;
          const { data, error } = await supabase.storage
            .from("recordings")
            .upload(filename, blob, { contentType: "video/webm" });

          if (error) {
            console.error("[Recording] Upload error:", error);
            toast.error("Erreur lors de l'upload de l'enregistrement");
            return;
          }

          // Get public URL
          const { data: urlData } = supabase.storage
            .from("recordings")
            .getPublicUrl(filename);

          const recordingUrl = urlData?.publicUrl || null;

          // Update the room record
          if (recordingUrl) {
            await supabase
              .from("video_rooms")
              .update({ recording_url: recordingUrl })
              .eq("id", room.id);
            toast.success("Enregistrement sauvegardé");
          }
        } catch (err) {
          console.error("[Recording] Save error:", err);
          toast.error("Erreur lors de la sauvegarde de l'enregistrement");
        }
      };

      recorder.start(1000); // Collect data every second
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      toast.success("Enregistrement démarré");
    } catch (err) {
      console.error("[Recording] MediaRecorder error:", err);
      toast.error("Impossible de démarrer l'enregistrement");
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
    setIsRecording(false);
    toast.info("Enregistrement arrêté");
  }

  function toggleRecording() {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }

  function handleAutoRecordToggle(checked: boolean) {
    setAutoRecordEnabled(checked);
    if (checked && isLive && !isRecording) {
      startRecording();
    }
    if (!checked && isRecording) {
      stopRecording();
    }
  }

  // ---------------------------------------------------------------------------
  // Chat (broadcast via Supabase Realtime)
  // ---------------------------------------------------------------------------

  function handleSendChat() {
    if (!chatInput.trim()) return;
    const msg: ChatMessage = {
      id: `${currentUserId}-${Date.now()}`,
      sender: "Vous",
      text: chatInput,
      time: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
    };
    setChatMessages((prev) => [...prev, msg]);
    // Broadcast to other participants
    if (signalingChannelRef.current) {
      const participantName =
        room.participants.find((p) => p.user_id === currentUserId)?.user?.full_name ||
        room.host?.full_name ||
        "Participant";
      signalingChannelRef.current.send({
        type: "broadcast",
        event: "chat-message",
        payload: {
          ...msg,
          sender: participantName,
        },
      });
    }
    setChatInput("");
  }

  // ---------------------------------------------------------------------------
  // Room actions
  // ---------------------------------------------------------------------------

  function handleJoin() {
    startTransition(async () => {
      try {
        await joinRoom(room.id);
        toast.success("Vous avez rejoint la visio");
        if (isLive) {
          await startStream();
        }
        router.refresh();
      } catch {
        toast.error("Erreur lors de la connexion");
      }
    });
  }

  function handleStart() {
    startTransition(async () => {
      try {
        await startRoom(room.id);
        toast.success("Visioconférence démarrée");
        await startStream();
        if (autoRecordEnabled && !isRecording) {
          startRecording();
        }
        router.refresh();
      } catch {
        toast.error("Erreur lors du démarrage");
      }
    });
  }

  function handleEnd() {
    startTransition(async () => {
      try {
        // Stop recording if active
        if (isRecording) {
          stopRecording();
        }
        stopStream();
        cleanupAllPeers();
        if (screenStreamRef.current) {
          screenStreamRef.current.getTracks().forEach((track) => track.stop());
          screenStreamRef.current = null;
          setScreenSharing(false);
        }
        // Announce leave
        if (signalingChannelRef.current) {
          signalingChannelRef.current.send({
            type: "broadcast",
            event: "webrtc-signal",
            payload: { type: "leave", from: currentUserId },
          });
        }
        await endRoom(room.id);
        toast.success("Visioconférence terminée");
        router.refresh();
      } catch {
        toast.error("Erreur lors de l'arrêt");
      }
    });
  }

  function handleLeave() {
    // Stop recording if active
    if (isRecording) {
      stopRecording();
    }
    stopStream();
    cleanupAllPeers();
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
    }
    // Announce leave
    if (signalingChannelRef.current) {
      signalingChannelRef.current.send({
        type: "broadcast",
        event: "webrtc-signal",
        payload: { type: "leave", from: currentUserId },
      });
      supabaseRef.current.removeChannel(signalingChannelRef.current);
      signalingChannelRef.current = null;
      signalingJoinedRef.current = false;
    }
    toast.info("Vous avez quitté l'appel");
    router.push("/chat/video");
  }

  // ---------------------------------------------------------------------------
  // Polls
  // ---------------------------------------------------------------------------

  function handleCreatePoll() {
    const validOptions = pollOptions.filter((o) => o.trim());
    if (!pollQuestion.trim() || validOptions.length < 2) {
      toast.error("Question et au moins 2 options requises");
      return;
    }

    startTransition(async () => {
      try {
        await createPoll({
          roomId: room.id,
          question: pollQuestion,
          options: validOptions,
        });
        toast.success("Sondage créé");
        setPollQuestion("");
        setPollOptions(["", ""]);
        setPollDialogOpen(false);
        const updated = await getRoomPolls(room.id);
        setPolls(updated as Poll[]);
      } catch {
        toast.error("Erreur lors de la création du sondage");
      }
    });
  }

  function handleVote(pollId: string, optionIndex: number) {
    startTransition(async () => {
      try {
        await votePoll(pollId, optionIndex);
        toast.success("Vote enregistré");
        const updated = await getRoomPolls(room.id);
        setPolls(updated as Poll[]);
      } catch {
        toast.error("Erreur lors du vote");
      }
    });
  }

  function addPollOption() {
    setPollOptions((prev) => [...prev, ""]);
  }

  function updatePollOption(index: number, value: string) {
    setPollOptions((prev) => prev.map((o, i) => (i === index ? value : o)));
  }

  function handlePollsTab() {
    setSidebarTab("polls");
    startTransition(async () => {
      const data = await getRoomPolls(room.id);
      setPolls(data as Poll[]);
    });
  }

  // ---------------------------------------------------------------------------
  // Derived state
  // ---------------------------------------------------------------------------

  const hasRemoteStream = remoteStreams.size > 0;

  // Find the name of the first connected remote peer
  const remotePeerName = (() => {
    if (remoteStreams.size === 0) return null;
    const remotePeerId = remoteStreams.keys().next().value;
    const participant = room.participants.find((p) => p.user_id === remotePeerId);
    if (participant?.user?.full_name) return participant.user.full_name;
    if (participant?.user?.email) return participant.user.email;
    // Check if it's the host
    if (remotePeerId === room.host_id) {
      return room.host?.full_name || room.host?.email || "Participant";
    }
    return "Participant";
  })();

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="h-[calc(100dvh-180px)] md:h-[calc(100dvh-120px)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/chat/video">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="font-semibold text-sm">{room.title}</h1>
            <p className="text-xs text-muted-foreground">
              {room.host?.full_name || room.host?.email || "Hôte"}
              {room.scheduled_at &&
                ` — ${format(new Date(room.scheduled_at), "d MMM yyyy 'à' HH:mm", { locale: fr })}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Auto Recording toggle */}
          {isHost && (isScheduled || isLive) && (
            <div className="flex items-center gap-1.5 mr-2">
              <Label htmlFor="auto-record" className="text-xs text-muted-foreground cursor-pointer">
                Enreg. auto
              </Label>
              <Switch
                id="auto-record"
                checked={autoRecordEnabled}
                onCheckedChange={handleAutoRecordToggle}
                aria-label="Enregistrement automatique"
              />
            </div>
          )}
          {/* Recording indicator */}
          {isRecording && (
            <button
              onClick={toggleRecording}
              className="flex items-center gap-1.5 text-red-600 text-xs font-medium bg-red-500/10 rounded-full px-2.5 py-1 hover:bg-red-500/20 transition-colors"
            >
              <Circle className="h-2.5 w-2.5 fill-red-500 animate-pulse" />
              REC
            </button>
          )}
          {isLive && !isRecording && (
            <button
              onClick={toggleRecording}
              className="flex items-center gap-1.5 text-muted-foreground text-xs font-medium hover:text-red-500 transition-colors"
            >
              <Circle className="h-2.5 w-2.5" />
              REC
            </button>
          )}
          {isHost && isScheduled && (
            <Button
              size="sm"
              onClick={handleStart}
              disabled={isPending}
              className="bg-brand text-brand-dark hover:bg-brand/90"
            >
              <Play className="h-3.5 w-3.5 mr-1" />
              Démarrer
            </Button>
          )}
          {isHost && isLive && (
            <Button
              size="sm"
              variant="destructive"
              onClick={handleEnd}
              disabled={isPending}
            >
              <PhoneOff className="h-3.5 w-3.5 mr-1" />
              Terminer
            </Button>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video area */}
        <div className="flex-1 flex flex-col">
          {/* Video grid / placeholder */}
          <div className="flex-1 bg-gray-900 relative">
            {isLive && stream ? (
              <>
                {/* Participant grid */}
                <div className="h-full grid grid-cols-1 md:grid-cols-2 gap-1 p-1">
                  {/* Remote participant */}
                  <div className="bg-gray-800 rounded-lg overflow-hidden relative">
                    {hasRemoteStream ? (
                      <>
                        <video
                          ref={remoteVideoRef}
                          autoPlay
                          playsInline
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute bottom-2 left-2 bg-black/60 text-white rounded px-2 py-0.5 text-xs">
                          {remotePeerName}
                        </div>
                      </>
                    ) : (
                      <div className="h-full flex items-center justify-center">
                        <div className="text-center text-gray-500">
                          <Users className="h-12 w-12 mx-auto mb-2 opacity-40" />
                          <p className="text-sm">En attente d&apos;un participant...</p>
                          <p className="text-xs text-gray-600 mt-1">
                            La connexion s&apos;établira automatiquement
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Local video (main grid) */}
                  <div className="bg-gray-800 rounded-lg overflow-hidden relative">
                    <video
                      ref={localVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className={`w-full h-full object-cover ${!videoEnabled ? "hidden" : ""}`}
                    />
                    {!videoEnabled && (
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                        <div className="text-center text-gray-400">
                          <CameraOff className="h-10 w-10 mx-auto mb-2 opacity-60" />
                          <p className="text-xs">Caméra désactivée</p>
                        </div>
                      </div>
                    )}
                    <div className="absolute bottom-2 left-2 bg-black/60 text-white rounded px-2 py-0.5 text-xs">
                      Vous {!audioEnabled && "(muet)"}
                    </div>
                  </div>
                </div>

                {/* PiP local video overlay (small corner) — only shown when remote is connected */}
                {hasRemoteStream && (
                  <div className="absolute bottom-16 right-4 w-40 h-28 rounded-lg overflow-hidden border-2 border-white/20 shadow-lg z-10">
                    <video
                      autoPlay
                      playsInline
                      muted
                      ref={(el) => {
                        if (el && stream) el.srcObject = stream;
                      }}
                      className={`w-full h-full object-cover ${!videoEnabled ? "hidden" : ""}`}
                    />
                    {!videoEnabled && (
                      <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                        <CameraOff className="h-5 w-5 text-gray-500" />
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center text-gray-400">
                  <Camera className="h-16 w-16 mx-auto mb-4 opacity-40" />
                  {isLive ? (
                    <p className="text-lg font-medium text-white">
                      Visioconférence en cours...
                    </p>
                  ) : isScheduled ? (
                    <p className="text-lg font-medium">En attente de démarrage</p>
                  ) : (
                    <p className="text-lg font-medium">Visioconférence terminée</p>
                  )}
                  {isScheduled && !isHost && (
                    <Button
                      onClick={handleJoin}
                      disabled={isPending}
                      className="mt-4 bg-brand text-brand-dark hover:bg-brand/90"
                    >
                      Rejoindre la salle d&apos;attente
                    </Button>
                  )}
                  {isLive && (
                    <Button
                      onClick={handleJoin}
                      disabled={isPending}
                      className="mt-4 bg-brand text-brand-dark hover:bg-brand/90"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Rejoindre
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Participant count overlay */}
            <div className="absolute top-4 left-4 bg-black/60 text-white rounded-lg px-3 py-1.5 text-xs flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              {activeParticipants.length} / {room.max_participants}
            </div>

            {/* Connection status */}
            {isLive && stream && (
              <div className={`absolute top-4 left-32 rounded-lg px-3 py-1.5 text-xs flex items-center gap-1.5 ${
                hasRemoteStream
                  ? "bg-green-500/20 text-green-400"
                  : "bg-yellow-500/20 text-yellow-400"
              }`}>
                <div className={`h-2 w-2 rounded-full ${
                  hasRemoteStream ? "bg-green-500" : "bg-yellow-500 animate-pulse"
                }`} />
                {hasRemoteStream ? "Connecté" : "En attente..."}
              </div>
            )}

            {/* Screen sharing indicator */}
            {screenSharing && (
              <div className="absolute top-4 right-4 bg-brand/80 text-brand-dark rounded-lg px-3 py-1.5 text-xs flex items-center gap-1.5">
                <MonitorUp className="h-3.5 w-3.5" />
                Partage d&apos;écran actif
              </div>
            )}
          </div>

          {/* Controls bar */}
          {(isLive || isScheduled) && (
            <div className="bg-gray-900 border-t border-gray-700 py-3 px-4 flex items-center justify-center gap-3">
              <Button
                size="sm"
                variant={videoEnabled ? "secondary" : "destructive"}
                onClick={toggleVideo}
                className="rounded-full h-10 w-10 p-0"
                title={videoEnabled ? "Désactiver la caméra" : "Activer la caméra"}
              >
                {videoEnabled ? (
                  <Camera className="h-4 w-4" />
                ) : (
                  <CameraOff className="h-4 w-4" />
                )}
              </Button>
              <Button
                size="sm"
                variant={audioEnabled ? "secondary" : "destructive"}
                onClick={toggleAudio}
                className="rounded-full h-10 w-10 p-0"
                title={audioEnabled ? "Couper le micro" : "Activer le micro"}
              >
                {audioEnabled ? (
                  <Mic className="h-4 w-4" />
                ) : (
                  <MicOff className="h-4 w-4" />
                )}
              </Button>
              <Button
                size="sm"
                variant={screenSharing ? "default" : "secondary"}
                onClick={handleScreenShare}
                className="rounded-full h-10 w-10 p-0"
                title={screenSharing ? "Arrêter le partage" : "Partager l'écran"}
              >
                {screenSharing ? (
                  <MonitorOff className="h-4 w-4" />
                ) : (
                  <MonitorUp className="h-4 w-4" />
                )}
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleLeave}
                className="rounded-full h-10 w-10 p-0"
                title="Quitter l&apos;appel"
              >
                <PhoneOff className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div className="w-80 border-l flex flex-col bg-background">
          {/* Sidebar tabs */}
          <div className="flex border-b">
            <button
              onClick={() => setSidebarTab("participants")}
              className={`flex-1 py-2.5 text-xs font-medium flex items-center justify-center gap-1 transition-colors ${
                sidebarTab === "participants"
                  ? "text-brand border-b-2 border-brand"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              Participants
            </button>
            <button
              onClick={() => setSidebarTab("chat")}
              className={`flex-1 py-2.5 text-xs font-medium flex items-center justify-center gap-1 transition-colors ${
                sidebarTab === "chat"
                  ? "text-brand border-b-2 border-brand"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Chat
            </button>
            <button
              onClick={handlePollsTab}
              className={`flex-1 py-2.5 text-xs font-medium flex items-center justify-center gap-1 transition-colors ${
                sidebarTab === "polls"
                  ? "text-brand border-b-2 border-brand"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              Sondages
            </button>
          </div>

          {/* Participants panel */}
          {sidebarTab === "participants" && (
            <ScrollArea className="flex-1 p-3">
              <div className="space-y-2">
                {/* Host */}
                {room.host && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-brand/5">
                    <div className="h-8 w-8 rounded-full bg-brand/20 flex items-center justify-center text-brand text-xs font-bold">
                      {room.host.full_name?.charAt(0) || room.host.email.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {room.host.full_name || room.host.email}
                      </p>
                      <p className="text-[10px] text-muted-foreground">Hôte</p>
                    </div>
                    <div className="h-2 w-2 rounded-full bg-brand" />
                  </div>
                )}

                {/* Other participants */}
                {activeParticipants
                  .filter((p) => p.user_id !== room.host_id)
                  .map((participant) => {
                    const isConnected = remoteStreams.has(participant.user_id);
                    return (
                      <div
                        key={participant.id}
                        className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50"
                      >
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-xs font-bold">
                          {participant.user?.full_name?.charAt(0) ||
                            participant.user?.email?.charAt(0) ||
                            "?"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {participant.user?.full_name ||
                              participant.user?.email ||
                              "Participant"}
                          </p>
                          {isConnected && (
                            <p className="text-[10px] text-green-500">Connecté</p>
                          )}
                        </div>
                        <div className={`h-2 w-2 rounded-full ${isConnected ? "bg-green-500" : "bg-brand"}`} />
                      </div>
                    );
                  })}

                {activeParticipants.length === 0 && !room.host && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Aucun participant
                  </p>
                )}
              </div>
            </ScrollArea>
          )}

          {/* Chat panel */}
          {sidebarTab === "chat" && (
            <div className="flex-1 flex flex-col">
              <ScrollArea className="flex-1 p-3">
                <div className="space-y-3">
                  {chatMessages.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Aucun message dans le chat
                    </p>
                  ) : (
                    chatMessages.map((msg) => (
                      <div key={msg.id} className="text-sm">
                        <div className="flex items-baseline gap-2">
                          <span className="font-medium text-xs">{msg.sender}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {msg.time}
                          </span>
                        </div>
                        <p className="text-muted-foreground text-xs mt-0.5">
                          {msg.text}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
              <div className="p-3 border-t flex gap-2">
                <Input
                  placeholder="Écrire un message..."
                  className="text-xs h-8"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && !e.shiftKey && handleSendChat()
                  }
                />
                <Button size="sm" className="h-8 w-8 p-0" onClick={handleSendChat}>
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}

          {/* Polls panel */}
          {sidebarTab === "polls" && (
            <div className="flex-1 flex flex-col">
              <div className="p-3 border-b">
                <Button
                  size="sm"
                  className="w-full bg-brand text-brand-dark hover:bg-brand/90"
                  onClick={() => setPollDialogOpen(true)}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Créer un sondage
                </Button>
              </div>
              <ScrollArea className="flex-1 p-3">
                <div className="space-y-4">
                  {polls.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Aucun sondage
                    </p>
                  ) : (
                    polls.map((poll) => {
                      const totalVotes = poll.options.reduce(
                        (sum, o) => sum + o.vote_count,
                        0
                      );
                      return (
                        <Card key={poll.id}>
                          <CardContent className="pt-4 pb-3">
                            <div className="flex items-start justify-between mb-2">
                              <p className="text-sm font-medium">
                                {poll.question}
                              </p>
                              {poll.is_active && (
                                <Badge className="bg-brand/10 text-brand border-brand/20 text-[10px]">
                                  Actif
                                </Badge>
                              )}
                            </div>
                            <div className="space-y-2">
                              {poll.options.map((option, idx) => {
                                const pct =
                                  totalVotes > 0
                                    ? Math.round(
                                        (option.vote_count / totalVotes) * 100
                                      )
                                    : 0;
                                return (
                                  <button
                                    key={idx}
                                    onClick={() =>
                                      poll.is_active &&
                                      handleVote(poll.id, idx)
                                    }
                                    disabled={!poll.is_active || isPending}
                                    className="w-full text-left"
                                  >
                                    <div className="flex items-center justify-between text-xs mb-1">
                                      <span>{option.text}</span>
                                      <span className="text-muted-foreground">
                                        {pct}% ({option.vote_count})
                                      </span>
                                    </div>
                                    <Progress value={pct} className="h-1.5" />
                                  </button>
                                );
                              })}
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-2">
                              {totalVotes} vote(s)
                            </p>
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      </div>

      {/* Create Poll Dialog */}
      <Dialog open={pollDialogOpen} onOpenChange={setPollDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Créer un sondage</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">Question</Label>
              <Input
                placeholder="Posez votre question..."
                value={pollQuestion}
                onChange={(e) => setPollQuestion(e.target.value)}
              />
            </div>
            <div>
              <Label className="mb-2 block">Options</Label>
              <div className="space-y-2">
                {pollOptions.map((option, idx) => (
                  <Input
                    key={idx}
                    placeholder={`Option ${idx + 1}`}
                    value={option}
                    onChange={(e) => updatePollOption(idx, e.target.value)}
                  />
                ))}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={addPollOption}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Ajouter une option
              </Button>
            </div>
            <Button
              onClick={handleCreatePoll}
              disabled={isPending}
              className="w-full bg-brand text-brand-dark hover:bg-brand/90"
            >
              {isPending ? "Création..." : "Créer le sondage"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
