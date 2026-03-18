"use client";

import { create } from "zustand";
import type { TranscriptEntry } from "@/lib/types/database";

export type CallPhase =
  | "idle"
  | "joining"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "ended";

export type NetworkQuality = "excellent" | "good" | "fair" | "poor" | "unknown";

interface CallState {
  phase: CallPhase;
  setPhase: (phase: CallPhase) => void;

  isMicOn: boolean;
  toggleMic: () => void;
  isCameraOn: boolean;
  toggleCamera: () => void;
  isScreenSharing: boolean;
  setScreenSharing: (v: boolean) => void;

  remoteUserId: string | null;
  remoteUserName: string | null;
  isRemoteConnected: boolean;
  setRemotePeer: (id: string | null, name: string | null) => void;
  setRemoteConnected: (v: boolean) => void;

  callStartTime: number | null;
  setCallStartTime: (t: number | null) => void;

  networkQuality: NetworkQuality;
  setNetworkQuality: (q: NetworkQuality) => void;

  lastError: string | null;
  setLastError: (err: string | null) => void;

  reconnectAttempt: number;
  setReconnectAttempt: (n: number) => void;

  // Transcription
  isTranscribing: boolean;
  setTranscribing: (v: boolean) => void;
  transcriptEntries: TranscriptEntry[];
  addTranscriptEntry: (entry: TranscriptEntry) => void;

  // Incoming call notification
  incomingCallId: string | null;
  incomingCallerName: string | null;
  setIncomingCall: (id: string | null, name: string | null) => void;

  resetCall: () => void;
}

const initialState = {
  phase: "idle" as CallPhase,
  isMicOn: true,
  isCameraOn: true,
  isScreenSharing: false,
  remoteUserId: null as string | null,
  remoteUserName: null as string | null,
  isRemoteConnected: false,
  callStartTime: null as number | null,
  networkQuality: "unknown" as NetworkQuality,
  lastError: null as string | null,
  reconnectAttempt: 0,
  isTranscribing: false,
  transcriptEntries: [] as TranscriptEntry[],
  incomingCallId: null as string | null,
  incomingCallerName: null as string | null,
};

export const useCallStore = create<CallState>((set) => ({
  ...initialState,

  setPhase: (phase) => set({ phase }),

  toggleMic: () => set((s) => ({ isMicOn: !s.isMicOn })),
  toggleCamera: () => set((s) => ({ isCameraOn: !s.isCameraOn })),
  setScreenSharing: (v) => set({ isScreenSharing: v }),

  setRemotePeer: (id, name) => set({ remoteUserId: id, remoteUserName: name }),
  setRemoteConnected: (v) => set({ isRemoteConnected: v }),

  setCallStartTime: (t) => set({ callStartTime: t }),

  setNetworkQuality: (q) => set({ networkQuality: q }),

  setLastError: (err) => set({ lastError: err }),

  setReconnectAttempt: (n) => set({ reconnectAttempt: n }),

  setTranscribing: (v) => set({ isTranscribing: v }),
  addTranscriptEntry: (entry) =>
    set((s) => ({ transcriptEntries: [...s.transcriptEntries, entry] })),

  setIncomingCall: (id, name) =>
    set({ incomingCallId: id, incomingCallerName: name }),

  resetCall: () => set(initialState),
}));
