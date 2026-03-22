"use client";

import {
  useCallStore,
  type CallPhase,
  type NetworkQuality,
} from "@/stores/call-store";
import {
  Loader2,
  Wifi,
  WifiOff,
  Signal,
  SignalLow,
  SignalMedium,
  SignalHigh,
} from "lucide-react";

const STATUS_CONFIG: Record<
  CallPhase,
  { label: string; icon: "loading" | "ok" | "error"; color: string } | null
> = {
  idle: null,
  joining: {
    label: "Acces aux peripheriques...",
    icon: "loading",
    color: "text-zinc-400",
  },
  connecting: {
    label: "Connexion en cours...",
    icon: "loading",
    color: "text-yellow-500",
  },
  connected: { label: "Connecte", icon: "ok", color: "text-[#10b981]" },
  reconnecting: {
    label: "Reconnexion...",
    icon: "loading",
    color: "text-orange-500",
  },
  ended: {
    label: "Session terminee",
    icon: "error",
    color: "text-zinc-400",
  },
};

const QUALITY_CONFIG: Record<
  NetworkQuality,
  {
    label: string;
    color: string;
    Icon: React.ComponentType<{ className?: string }>;
  }
> = {
  excellent: { label: "Excellent", color: "text-[#10b981]", Icon: SignalHigh },
  good: { label: "Bon", color: "text-[#10b981]", Icon: SignalHigh },
  fair: { label: "Moyen", color: "text-yellow-400", Icon: SignalMedium },
  poor: { label: "Faible", color: "text-red-400", Icon: SignalLow },
  unknown: { label: "", color: "text-zinc-500", Icon: Signal },
};

export function ConnectionStatus() {
  const phase = useCallStore((s) => s.phase);
  const isRemoteConnected = useCallStore((s) => s.isRemoteConnected);
  const networkQuality = useCallStore((s) => s.networkQuality);
  const reconnectAttempt = useCallStore((s) => s.reconnectAttempt);

  const config = STATUS_CONFIG[phase];
  if (!config) return null;

  const label =
    phase === "connected" && !isRemoteConnected
      ? "En attente du participant..."
      : phase === "reconnecting" && reconnectAttempt > 0
        ? `Reconnexion (${reconnectAttempt}/5)...`
        : config.label;

  const qualityInfo = QUALITY_CONFIG[networkQuality];

  return (
    <div className="flex items-center gap-2">
      <div className={`flex items-center gap-1.5 ${config.color}`}>
        {config.icon === "loading" && (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        )}
        {config.icon === "ok" && <Wifi className="w-3.5 h-3.5" />}
        {config.icon === "error" && <WifiOff className="w-3.5 h-3.5" />}
        <span className="text-xs font-medium">{label}</span>
      </div>

      {phase === "connected" &&
        isRemoteConnected &&
        networkQuality !== "unknown" && (
          <div
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-muted ${qualityInfo.color}`}
            title={`Qualite reseau : ${qualityInfo.label}`}
          >
            <qualityInfo.Icon className="w-3 h-3" />
            <span className="text-[10px] font-medium hidden sm:inline">
              {qualityInfo.label}
            </span>
          </div>
        )}
    </div>
  );
}
