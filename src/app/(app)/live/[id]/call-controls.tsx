"use client";

import { cn } from "@/lib/utils";
import { useCallStore } from "@/stores/call-store";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  MonitorOff,
  PhoneOff,
  MessageSquare,
  ScrollText,
  StickyNote,
} from "lucide-react";

interface CallControlsProps {
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onToggleScreenShare: () => void;
  onHangUp: () => void;
  onToggleChat: () => void;
  onToggleTranscript?: () => void;
  onToggleNotes?: () => void;
  isChatOpen?: boolean;
  isTranscriptOpen?: boolean;
  isNotesOpen?: boolean;
  isTranscriptionSupported?: boolean;
}

export function CallControls({
  onToggleMic,
  onToggleCamera,
  onToggleScreenShare,
  onHangUp,
  onToggleChat,
  onToggleTranscript,
  onToggleNotes,
  isChatOpen,
  isTranscriptOpen,
  isNotesOpen,
  isTranscriptionSupported,
}: CallControlsProps) {
  const { isMicOn, isCameraOn, isScreenSharing } = useCallStore();

  return (
    <div className="flex items-center justify-center gap-2 py-4 px-4 bg-background/80 backdrop-blur-md">
      <ControlButton
        onClick={onToggleMic}
        active={isMicOn}
        activeIcon={Mic}
        inactiveIcon={MicOff}
        label={isMicOn ? "Couper le micro" : "Activer le micro"}
        dangerWhenInactive
      />

      <ControlButton
        onClick={onToggleCamera}
        active={isCameraOn}
        activeIcon={Video}
        inactiveIcon={VideoOff}
        label={isCameraOn ? "Couper la camera" : "Activer la camera"}
        dangerWhenInactive
      />

      <ControlButton
        onClick={onToggleChat}
        active={!!isChatOpen}
        activeIcon={MessageSquare}
        inactiveIcon={MessageSquare}
        label={isChatOpen ? "Fermer le chat" : "Ouvrir le chat"}
        highlightWhenActive
      />

      {isTranscriptionSupported && onToggleTranscript && (
        <ControlButton
          onClick={onToggleTranscript}
          active={!!isTranscriptOpen}
          activeIcon={ScrollText}
          inactiveIcon={ScrollText}
          label={
            isTranscriptOpen
              ? "Masquer la transcription"
              : "Afficher la transcription"
          }
          highlightWhenActive
        />
      )}

      {onToggleNotes && (
        <ControlButton
          onClick={onToggleNotes}
          active={!!isNotesOpen}
          activeIcon={StickyNote}
          inactiveIcon={StickyNote}
          label={isNotesOpen ? "Fermer les notes" : "Ouvrir les notes"}
          highlightWhenActive
        />
      )}

      <ControlButton
        onClick={onToggleScreenShare}
        active={isScreenSharing}
        activeIcon={MonitorOff}
        inactiveIcon={Monitor}
        label={isScreenSharing ? "Arreter le partage" : "Partager l'ecran"}
        highlightWhenActive
      />

      <button
        onClick={onHangUp}
        className="w-12 h-12 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center text-white transition-all active:scale-90 ml-4"
        title="Raccrocher"
      >
        <PhoneOff className="w-5 h-5" />
      </button>
    </div>
  );
}

function ControlButton({
  onClick,
  active,
  activeIcon: ActiveIcon,
  inactiveIcon: InactiveIcon,
  label,
  dangerWhenInactive,
  highlightWhenActive,
}: {
  onClick: () => void;
  active: boolean;
  activeIcon: React.ComponentType<{ className?: string }>;
  inactiveIcon: React.ComponentType<{ className?: string }>;
  label: string;
  dangerWhenInactive?: boolean;
  highlightWhenActive?: boolean;
}) {
  const Icon = active ? ActiveIcon : InactiveIcon;

  return (
    <button
      onClick={onClick}
      title={label}
      className={cn(
        "w-11 h-11 rounded-full flex items-center justify-center transition-all active:scale-90",
        !active && dangerWhenInactive
          ? "bg-red-600/20 text-red-400 hover:bg-red-600/30"
          : active && highlightWhenActive
            ? "bg-[#7af17a]/20 text-[#7af17a] hover:bg-[#7af17a]/30"
            : "bg-muted text-foreground hover:bg-muted/80",
      )}
    >
      <Icon className="w-5 h-5" />
    </button>
  );
}
